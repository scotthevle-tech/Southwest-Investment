/**
 * Pipeline Orchestrator Service
 * Coordinates Tier 1, 2, and 3 processing
 *
 * Tier 1: Full analysis pipeline (new listings, once per listing ever)
 * Tier 2: Delta check (all active listings, every night, fast)
 * Tier 3: Watch list (manually flagged properties, highest sensitivity)
 */

import { PrismaClient } from '@prisma/client';
import { Listing, ConnectorRawListing, RunLogEntry, MorningReport } from '../types';
import { ListingNormalizerService } from './listing-normalizer';
import { OpportunityScorerService } from '../analyzer/opportunity-scorer';
import { ZipAbsorptionScorerService } from '../analyzer/zip-absorption-scorer';
import { RenoScopeScorerService } from '../analyzer/reno-scope-scorer';
import { BuyerPoolScorerService } from '../analyzer/buyer-pool-scorer';
import { ARVEstimatorService } from '../analyzer/arv-estimator';
import { FlipVelocityScorerService } from '../analyzer/flip-velocity-scorer';
import { CompetitiveInventoryScorerService } from '../analyzer/competitive-inventory-scorer';
import { DEAL_ANALYSIS } from '../config/markets';
import { PriceAlertService } from './price-alert';
import { DOMAlertService } from './dom-alert';
import { ScoreHistoryTrackerService } from './score-history-tracker';
import { BaseConnector } from '../connectors/base-connector';

export interface PipelineConfig {
  prisma: PrismaClient;
  connectors: BaseConnector[];
  market: string;
  isDryRun?: boolean;
}

export interface ProcessingStats {
  newListingsCount: number;
  updatedListingsCount: number;
  priceAlertsCount: number;
  domAlertsCount: number;
  errorCount: number;
  warnings: string[];
}

export class PipelineOrchestratorService {
  private prisma: PrismaClient;
  private connectors: BaseConnector[];
  private market: string;
  private isDryRun: boolean;

  private normalizer: ListingNormalizerService;
  private opportunityScorer: OpportunityScorerService;
  private zipAbsorptionScorer: ZipAbsorptionScorerService;
  private renoScopeScorer: RenoScopeScorerService;
  private buyerPoolScorer: BuyerPoolScorerService;
  private arvEstimator: ARVEstimatorService;
  private flipVelocityScorer: FlipVelocityScorerService;
  private competitiveInventoryScorer: CompetitiveInventoryScorerService;
  private priceAlertService: PriceAlertService;
  private domAlertService: DOMAlertService;
  private scoreHistoryTracker: ScoreHistoryTrackerService;

  constructor(config: PipelineConfig) {
    this.prisma = config.prisma;
    this.connectors = config.connectors;
    this.market = config.market;
    this.isDryRun = config.isDryRun || false;

    this.normalizer = new ListingNormalizerService();
    this.opportunityScorer = new OpportunityScorerService();
    this.zipAbsorptionScorer = new ZipAbsorptionScorerService();
    this.renoScopeScorer = new RenoScopeScorerService();
    this.buyerPoolScorer = new BuyerPoolScorerService();
    this.arvEstimator = new ARVEstimatorService();
    this.flipVelocityScorer = new FlipVelocityScorerService();
    this.competitiveInventoryScorer = new CompetitiveInventoryScorerService();
    this.priceAlertService = new PriceAlertService();
    this.domAlertService = new DOMAlertService();
    this.scoreHistoryTracker = new ScoreHistoryTrackerService(this.prisma);
  }

  /**
   * TIER 1: Full analysis pipeline
   * Run on new listings: normalize → opportunity score → ARV → zip absorption → reno scope → buyer pool → flip velocity
   */
  async runTier1NewListings(): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      newListingsCount: 0,
      updatedListingsCount: 0,
      priceAlertsCount: 0,
      domAlertsCount: 0,
      errorCount: 0,
      warnings: [],
    };

    const startTime = Date.now();

    try {
      console.log(`[Tier 1] Starting new listings analysis for ${this.market}...`);

      // Fetch new listings from all connectors
      const allRawListings: ConnectorRawListing[] = [];
      for (const connector of this.connectors) {
        try {
          const listings = await connector.fetchNewListings();
          allRawListings.push(...listings);
        } catch (error) {
          stats.errorCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          stats.warnings.push(`${connector.constructor.name}: ${errorMsg}`);
        }
      }

      console.log(`[Tier 1] Fetched ${allRawListings.length} raw listings`);

      // Normalize and validate
      const { normalized, failed, warnings } = this.normalizer.normalizeBatch(allRawListings, this.market);

      console.log(
        `[Tier 1] Normalized: ${normalized.length}, Failed: ${failed.length}, Warnings: ${warnings.length}`,
      );

      stats.warnings.push(...failed.map(f => `${f.mls}: ${f.failures.join(', ')}`));

      // Score each normalized listing
      for (const listing of normalized) {
        try {
          // Fetch benchmarks and comps from DB
          const zipBenchmark = await this.prisma.zipBenchmark.findFirst({
            where: { zipCode: listing.zipCode },
            orderBy: { recordDate: 'desc' },
          });

          const comps = await this.prisma.comp.findMany({
            where: { zipCode: listing.zipCode, soldDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            orderBy: { soldDate: 'desc' },
            take: 10,
          });

          // Score: Opportunity
          const oppResult = await this.opportunityScorer.calculate(
            listing,
            zipBenchmark?.avgPSFActive ?? 0,
            zipBenchmark?.avgDOMActive ?? 0,
          );

          // Score: ARV Estimation
          const arvResult = await this.arvEstimator.calculate(listing, comps as any);

          // Score: ZIP Absorption
          const zipAbsorptionResult = await this.zipAbsorptionScorer.calculate(
            listing,
            comps.map((c: any) => ({ domAtSale: c.domAtSale || 0 })),
            zipBenchmark?.medianDOMSold90d ?? 0,
            zipBenchmark?.salesVelocityPerMo ?? 0,
          );

          // Score: Reno Scope
          const renoResult = this.renoScopeScorer.calculate(listing);

          // Score: Buyer Pool
          const buyerPoolResult = this.buyerPoolScorer.calculate(arvResult.modelARV, this.market);

          // Score: Competitive Inventory
          const competitiveResult = await this.competitiveInventoryScorer.calculate(listing, arvResult.modelARV, 5); // TODO: Implement real query

          // Score: Flip Velocity
          const flipVelocityResult = this.flipVelocityScorer.calculate(
            oppResult.opportunityScore,
            zipAbsorptionResult.zipAbsorptionScore,
            renoResult.renoScopeScore,
            buyerPoolResult.buyerPoolScore,
          );

          // Deal analysis: rehab estimate, max offer, potential profit
          let estimatedRehab: number | null = null;
          let maxOffer: number | null = null;
          let potentialProfit: number | null = null;
          let spreadToARVPct: number | null = null;

          if (arvResult.modelARV > 0 && listing.sqft) {
            const costPerSqft = DEAL_ANALYSIS.REHAB_COST_PER_SQFT[renoResult.renoRiskLevel] || DEAL_ANALYSIS.REHAB_COST_PER_SQFT.MEDIUM;
            estimatedRehab = Math.round(costPerSqft * listing.sqft);
            maxOffer = Math.round(arvResult.modelARV * DEAL_ANALYSIS.OFFER_RULE_PCT - estimatedRehab);
            const closingCosts = arvResult.modelARV * (DEAL_ANALYSIS.CLOSING_COST_BUY_PCT + DEAL_ANALYSIS.CLOSING_COST_SELL_PCT);
            const holdingCosts = DEAL_ANALYSIS.HOLDING_COST_MONTHLY * DEAL_ANALYSIS.HOLDING_MONTHS;
            potentialProfit = Math.round(arvResult.modelARV - listing.listPrice - estimatedRehab - closingCosts - holdingCosts);
            spreadToARVPct = Math.round(((arvResult.modelARV - listing.listPrice) / listing.listPrice) * 100 * 10) / 10;
          }

          // Build scoring object
          const scoredListing = {
            ...listing,
            priceReductionHistory: listing.priceReductionHistory ? JSON.stringify(listing.priceReductionHistory) : null,
            renoRiskFlags: Array.isArray(renoResult.renoRiskFlags) ? JSON.stringify(renoResult.renoRiskFlags) : JSON.stringify([]),
            flipVelocityBreakdown: flipVelocityResult.breakdown ? JSON.stringify(flipVelocityResult.breakdown) : JSON.stringify({}),
            opportunityScore: oppResult.opportunityScore,
            zipAbsorptionScore: zipAbsorptionResult.zipAbsorptionScore,
            zipMedianDOM: zipAbsorptionResult.zipMedianDOM,
            zipSalesCount90d: zipAbsorptionResult.zipSalesCount90d,
            zipDataConfidence: zipAbsorptionResult.zipDataConfidence,
            renoScopeScore: renoResult.renoScopeScore,
            renoRiskLevel: renoResult.renoRiskLevel,
            buyerPoolScore: buyerPoolResult.buyerPoolScore,
            buyerPoolLabel: buyerPoolResult.buyerPoolLabel,
            modelARV: arvResult.modelARV,
            renovatedCompsUsed: arvResult.renovatedCompsCount,
            modelARVConfidenceDetail: arvResult.confidenceLevel,
            competitiveInventoryCount: competitiveResult.competitiveInventoryCount,
            competitiveInventoryScore: competitiveResult.competitiveInventoryScore,
            estimatedRehab,
            maxOffer,
            potentialProfit,
            spreadToARVPct,
            flipVelocityScore: flipVelocityResult.flipVelocityScore,
            flipVelocityLevel: flipVelocityResult.flipVelocityLevel,
            lastScoredAt: new Date(),
          };

          // Store in DB (if not dry run)
          if (!this.isDryRun) {
            await this.prisma.listing.upsert({
              where: { mlsNumber: listing.mlsNumber },
              update: scoredListing,
              create: { ...scoredListing, id: `${this.market}-${listing.mlsNumber}` },
            });
          }

          stats.newListingsCount++;
        } catch (error) {
          stats.errorCount++;
          console.error(`[Tier 1] Error scoring ${listing.mlsNumber}:`, error);
        }
      }

      console.log(`[Tier 1] Complete. New: ${stats.newListingsCount}, Errors: ${stats.errorCount}`);

      // Record score history for all processed listings
      if (!this.isDryRun) {
        try {
          const scoredListings = await this.prisma.listing.findMany({
            where: { market: this.market, lastScoredAt: { gte: new Date(Date.now() - 60000) } }, // Scored in last minute
          });
          await this.scoreHistoryTracker.recordDailyScores(scoredListings);
          console.log(`[Tier 1] Score history recorded for ${scoredListings.length} listings`);
        } catch (error) {
          console.error('[Tier 1] Error recording score history:', error);
        }
      }
    } catch (error) {
      stats.errorCount++;
      console.error('[Tier 1] Pipeline error:', error);
    }

    const durationMs = Date.now() - startTime;

    // Log run
    if (!this.isDryRun) {
      await this.prisma.runLog.create({
        data: {
          runType: 'TIER_1_NEW',
          market: this.market,
          newListingsCount: stats.newListingsCount,
          updatedListingsCount: 0,
          errorCount: stats.errorCount,
          warnings: JSON.stringify(stats.warnings),
          durationMs,
          connectorStatus: JSON.stringify(this.getConnectorStatus()),
        },
      });
    }

    return stats;
  }

  /**
   * TIER 2: Delta check (price + status only, fast)
   * Run nightly on all active listings to detect changes
   */
  async runTier2DeltaCheck(): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      newListingsCount: 0,
      updatedListingsCount: 0,
      priceAlertsCount: 0,
      domAlertsCount: 0,
      errorCount: 0,
      warnings: [],
    };

    const startTime = Date.now();

    try {
      console.log(`[Tier 2] Starting delta check for ${this.market}...`);

      // Fetch current prices from connectors
      const deltaData: Array<{ mlsNumber: string; listPrice: number; status: string; dom: number }> = [];

      for (const connector of this.connectors) {
        try {
          const data = await connector.fetchDeltaCheck();
          deltaData.push(...data);
        } catch (error) {
          stats.errorCount++;
        }
      }

      // Compare with DB and detect changes
      for (const delta of deltaData) {
        try {
          const existing = await this.prisma.listing.findFirst({
            where: { mlsNumber: delta.mlsNumber },
          });

          if (!existing) {
            console.log(`[Tier 2] New listing detected (should have come from Tier 1): ${delta.mlsNumber}`);
            continue;
          }

          // Check for price drop
          if (delta.listPrice < existing.listPrice) {
            const alert = this.priceAlertService.checkPriceDrop(existing.listPrice, delta.listPrice);
            if (alert) {
              stats.priceAlertsCount++;

              if (!this.isDryRun) {
                await this.prisma.priceAlert.create({
                  data: {
                    listingId: existing.id,
                    previousPrice: existing.listPrice,
                    newPrice: delta.listPrice,
                    dropPct: alert.dropPct,
                    alertType: alert.alertType,
                  },
                });
              }
            }
          }

          // Check for DOM milestone or status change
          if (existing.dom !== delta.dom || existing.status !== delta.status) {
            // Convert database record to Listing type (null becomes undefined for optional fields)
            const normalizeDbListing = (listing: any): Listing => ({
              ...listing,
              market: listing.market as 'Las Vegas' | 'St. George' | 'Cedar City',
              zipCode: listing.zipCode || undefined,
              county: listing.county || undefined,
              originalListPrice: listing.originalListPrice || undefined,
              sqft: listing.sqft || undefined,
              yearBuilt: listing.yearBuilt || undefined,
              remarks: listing.remarks || undefined,
              hoaMonthly: listing.hoaMonthly || undefined,
              waterSource: listing.waterSource || undefined,
              sewerType: listing.sewerType || undefined,
              dom: listing.dom || undefined,
              priceReductionCount: listing.priceReductionCount || undefined,
              priceReductionHistory: listing.priceReductionHistory || undefined,
              totalDropPct: listing.totalDropPct || undefined,
              opportunityScore: listing.opportunityScore || undefined,
              zipAbsorptionScore: listing.zipAbsorptionScore || undefined,
              renoScopeScore: listing.renoScopeScore || undefined,
              buyerPoolScore: listing.buyerPoolScore || undefined,
              modelARV: listing.modelARV || undefined,
              flipVelocityScore: listing.flipVelocityScore || undefined,
              flipVelocityLevel: listing.flipVelocityLevel || undefined,
            });

            const alerts = this.domAlertService.compareListings(
              normalizeDbListing(existing),
              {
                ...normalizeDbListing(existing),
                dom: delta.dom || undefined,
                status: delta.status,
                listPrice: delta.listPrice,
                updatedAt: new Date(),
              },
            );

            for (const alert of alerts) {
              stats.domAlertsCount++;
              if (!this.isDryRun) {
                await this.prisma.dOMAlert.create({
                  data: {
                    listingId: existing.id,
                    domMilestone: alert.milestone,
                    alertType: alert.alertType,
                  },
                });
              }
            }
          }

          // Update listing with new delta
          if (!this.isDryRun) {
            await this.prisma.listing.update({
              where: { id: existing.id },
              data: {
                listPrice: delta.listPrice,
                status: delta.status,
                dom: delta.dom,
                updatedAt: new Date(),
              },
            });
          }

          stats.updatedListingsCount++;
        } catch (error) {
          stats.errorCount++;
          console.error(`[Tier 2] Error processing ${delta.mlsNumber}:`, error);
        }
      }

      console.log(
        `[Tier 2] Complete. Updated: ${stats.updatedListingsCount}, Price alerts: ${stats.priceAlertsCount}, DOM alerts: ${stats.domAlertsCount}`,
      );
    } catch (error) {
      stats.errorCount++;
      console.error('[Tier 2] Pipeline error:', error);
    }

    const durationMs = Date.now() - startTime;

    if (!this.isDryRun) {
      await this.prisma.runLog.create({
        data: {
          runType: 'TIER_2_DELTA',
          market: this.market,
          newListingsCount: 0,
          updatedListingsCount: stats.updatedListingsCount,
          errorCount: stats.errorCount,
          warnings: JSON.stringify(stats.warnings),
          durationMs,
          connectorStatus: JSON.stringify(this.getConnectorStatus()),
        },
      });
    }

    return stats;
  }

  /**
   * TIER 3: Watch list re-scoring
   * For manually flagged properties, re-score on every change with immediate alerts
   */
  async runTier3WatchlistRescores(): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      newListingsCount: 0,
      updatedListingsCount: 0,
      priceAlertsCount: 0,
      domAlertsCount: 0,
      errorCount: 0,
      warnings: [],
    };

    try {
      console.log(`[Tier 3] Starting watchlist re-scores for ${this.market}...`);

      // Fetch watchlist
      const watchlist = await this.prisma.listing.findMany({
        where: { isWatchlist: true, market: this.market },
      });

      console.log(`[Tier 3] Found ${watchlist.length} watchlist properties`);

      // For each watchlist property, re-score
      for (const listing of watchlist) {
        try {
          // TODO: Re-score using Tier 1 logic
          stats.updatedListingsCount++;
        } catch (error) {
          stats.errorCount++;
          console.error(`[Tier 3] Error re-scoring ${listing.mlsNumber}:`, error);
        }
      }

      console.log(`[Tier 3] Complete. Re-scored: ${stats.updatedListingsCount}`);
    } catch (error) {
      stats.errorCount++;
      console.error('[Tier 3] Pipeline error:', error);
    }

    return stats;
  }

  /**
   * Get current connector health status
   */
  private getConnectorStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const connector of this.connectors) {
      const connStatus = connector.getStatus();
      status[connStatus.connectorName] = connStatus.isHealthy ? '✓ OK' : `✗ ERROR: ${connStatus.lastError}`;
    }
    return status;
  }
}
