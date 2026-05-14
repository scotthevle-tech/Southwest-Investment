/**
 * Core Metrics Calculator Service
 * Tracks the three key metrics: DOM, Price Change, Condition
 */

import { PrismaClient, Listing, PropertyScoreHistory } from '@prisma/client';
import { RenoScopeScorerService } from '../analyzer/reno-scope-scorer';
import crypto from 'crypto';

export interface CoreMetrics {
  dom: number | null;
  domDelta: number | null;
  domTrend: 'INCREASING' | 'STABLE' | 'DECREASING' | null;
  
  listPrice: number;
  priceDropPct: number | null;
  priceDropVelocity: number | null;  // % per week
  daysSinceLastPriceDrop: number | null;
  isPriceDroppingAccelerated: boolean;
  
  renoScopeScoreDelta: number | null;
  conditionRiskFlagCount: number;
  newConditionFlags: string[];
  conditionTrend: 'DETERIORATING' | 'STABLE' | 'IMPROVING' | null;
  remarksHash: string;
}

export class CoreMetricsCalculatorService {
  private renoScorer: RenoScopeScorerService;

  constructor(private prisma: PrismaClient) {
    this.renoScorer = new RenoScopeScorerService();
  }

  /**
   * Calculate all three core metrics for today
   */
  async calculateCoreMetrics(listing: Listing): Promise<CoreMetrics> {
    // Get yesterday's history record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayRecord = await this.prisma.propertyScoreHistory.findFirst({
      where: {
        listingId: listing.id,
        recordDate: yesterday,
      },
    });

    // Calculate DOM metrics
    const domMetrics = this.calculateDOMMetrics(listing, yesterdayRecord);

    // Calculate price metrics
    const priceMetrics = await this.calculatePriceMetrics(listing, yesterdayRecord);

    // Calculate condition metrics
    const conditionMetrics = await this.calculateConditionMetrics(listing, yesterdayRecord);

    // Hash remarks to detect changes
    const remarksHash = this.hashRemarks(listing.remarks);

    return {
      dom: domMetrics.dom ?? null,
      domDelta: domMetrics.domDelta ?? null,
      domTrend: domMetrics.domTrend ?? null,
      listPrice: listing.listPrice ?? 0,
      priceDropPct: priceMetrics.priceDropPct ?? null,
      priceDropVelocity: priceMetrics.priceDropVelocity ?? null,
      daysSinceLastPriceDrop: priceMetrics.daysSinceLastPriceDrop ?? null,
      isPriceDroppingAccelerated: priceMetrics.isPriceDroppingAccelerated ?? false,
      renoScopeScoreDelta: conditionMetrics.renoScopeScoreDelta ?? null,
      conditionRiskFlagCount: conditionMetrics.conditionRiskFlagCount ?? 0,
      newConditionFlags: conditionMetrics.newConditionFlags ?? [],
      conditionTrend: conditionMetrics.conditionTrend ?? null,
      remarksHash,
    };
  }

  /**
   * METRIC 1: Days on Market (DOM)
   * Track DOM daily, identify if property is staying on market longer
   */
  private calculateDOMMetrics(
    listing: Listing,
    yesterdayRecord: PropertyScoreHistory | null
  ): Partial<CoreMetrics> {
    const today = listing.dom || 0;
    const yesterday = yesterdayRecord?.dom || 0;
    const delta = today - yesterday;

    let domTrend: 'INCREASING' | 'STABLE' | 'DECREASING' | null = null;
    if (delta > 0) {
      domTrend = 'INCREASING';
    } else if (delta < 0) {
      // Property went back on market (was pending, now active)
      domTrend = 'DECREASING';
    } else {
      domTrend = 'STABLE';
    }

    return {
      dom: listing.dom,
      domDelta: delta > 0 ? delta : null,
      domTrend,
    };
  }

  /**
   * METRIC 2: Price Changes
   * Track price drops, calculate velocity, identify acceleration
   */
  private async calculatePriceMetrics(
    listing: Listing,
    yesterdayRecord: PropertyScoreHistory | null
  ): Promise<Partial<CoreMetrics>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Today's price vs yesterday's
    const yesterdayPrice = yesterdayRecord?.listPrice || listing.listPrice;
    const priceDropPct =
      yesterdayPrice > 0
        ? ((listing.listPrice - yesterdayPrice) / yesterdayPrice) * 100
        : null;

    // Calculate 7-day price drop velocity
    const last7Days = await this.prisma.propertyScoreHistory.findMany({
      where: {
        listingId: listing.id,
        recordDate: { gte: sevenDaysAgo, lte: today },
      },
      orderBy: { recordDate: 'asc' },
    });

    let priceDropVelocity: number | null = null;
    let daysSinceLastPriceDrop: number | null = null;
    let isPriceDroppingAccelerated = false;

    if (last7Days.length >= 2) {
      const firstPrice = last7Days[0].listPrice || listing.listPrice;
      const lastPrice = listing.listPrice;
      const totalDropPct = ((firstPrice - lastPrice) / firstPrice) * 100;
      priceDropVelocity = totalDropPct / 7; // % per day, multiply by 7 for weekly

      // Find days since last price drop
      for (let i = last7Days.length - 1; i >= 0; i--) {
        if (i > 0 && last7Days[i].listPrice! < last7Days[i - 1].listPrice!) {
          daysSinceLastPriceDrop = last7Days.length - 1 - i;
          break;
        }
      }

      // Check if acceleration (today's velocity > previous 3 days)
      if (last7Days.length >= 4) {
        const prev3DaysAvg =
          (last7Days[last7Days.length - 4].listPrice || 0) - listing.listPrice;
        const todayDrop = yesterdayPrice - listing.listPrice;
        if (todayDrop > prev3DaysAvg / 3) {
          isPriceDroppingAccelerated = true;
        }
      }
    } else if (priceDropPct && priceDropPct < 0) {
      daysSinceLastPriceDrop = 0;
    }

    return {
      listPrice: listing.listPrice,
      priceDropPct,
      priceDropVelocity,
      daysSinceLastPriceDrop,
      isPriceDroppingAccelerated,
    };
  }

  /**
   * METRIC 3: Condition of Property
   * Track condition score changes, detect new risk flags, identify deterioration
   */
  private async calculateConditionMetrics(
    listing: Listing,
    yesterdayRecord: PropertyScoreHistory | null
  ): Promise<Partial<CoreMetrics>> {
    // Type cast for RenoScorer (null values converted to undefined as needed)
    const renoResult = this.renoScorer.calculate(listing as any);

    const renoScopeScoreDelta = yesterdayRecord
      ? renoResult.renoScopeScore - yesterdayRecord.renoScopeScore!
      : 0;

    // Count risk flags
    const conditionRiskFlagCount = renoResult.renoRiskFlags?.length || 0;

    // Detect new flags
    let newConditionFlags: string[] = [];
    if (yesterdayRecord?.newConditionFlags) {
      const yesterdayFlags = JSON.parse(yesterdayRecord.newConditionFlags);
      newConditionFlags = (renoResult.renoRiskFlags || []).filter(
        flag => !yesterdayFlags.includes(flag)
      );
    } else {
      newConditionFlags = renoResult.renoRiskFlags || [];
    }

    // Determine condition trend
    let conditionTrend: 'DETERIORATING' | 'STABLE' | 'IMPROVING' | null = null;
    if (renoScopeScoreDelta < -5) {
      conditionTrend = 'DETERIORATING';
    } else if (renoScopeScoreDelta > 5) {
      conditionTrend = 'IMPROVING';
    } else {
      conditionTrend = 'STABLE';
    }

    return {
      renoScopeScoreDelta: renoScopeScoreDelta !== 0 ? renoScopeScoreDelta : null,
      conditionRiskFlagCount,
      newConditionFlags,
      conditionTrend,
    };
  }

  /**
   * Helper: Hash remarks to detect changes
   */
  private hashRemarks(remarks: string | null | undefined): string {
    const text = (remarks || '').toLowerCase();
    return crypto.createHash('md5').update(text).digest('hex');
  }
}
