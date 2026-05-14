/**
 * Score History Tracker Service
 * Tracks daily score changes and momentum for properties
 * Identifies trends: improving, declining, stable
 * 
 * FOCUS: Days on Market, Price Changes, Condition of Property
 */

import { PrismaClient, PropertyScoreHistory, Listing } from '@prisma/client';
import { CoreMetricsCalculatorService } from './core-metrics-calculator';

export interface PropertyScoreTrend {
  listingId: string;
  mlsNumber: string;
  address: string;
  market: string;
  
  today: {
    score: number;
    dom: number | null;
    listPrice: number | null;
    status: string;
  };
  
  yesterday?: {
    score: number;
    dom: number | null;
    listPrice: number | null;
  };
  
  scoreDelta: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  
  // CORE METRICS
  domMetrics: {
    dom: number | null;
    delta: number | null;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING' | null;
  };
  
  priceMetrics: {
    price: number | null;
    dropPct: number | null;
    velocity: number | null; // % per week
    daysSinceDrop: number | null;
    accelerating: boolean;
  };
  
  conditionMetrics: {
    scoreDelta: number | null;
    riskFlagCount: number;
    newFlags: string[];
    trend: 'DETERIORATING' | 'STABLE' | 'IMPROVING' | null;
  };
  
  isNewToList: boolean;
  appearanceCount: number;
  sevenDayHistory: number[];
}

export class ScoreHistoryTrackerService {
  private coreMetricsCalculator: CoreMetricsCalculatorService;

  constructor(private prisma: PrismaClient) {
    this.coreMetricsCalculator = new CoreMetricsCalculatorService(this.prisma);
  }

  /**
   * Record today's scores for all listed properties
   */
  async recordDailyScores(listings: Listing[]): Promise<PropertyScoreHistory[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recorded: PropertyScoreHistory[] = [];

    for (const listing of listings) {
      if (!listing.flipVelocityScore) continue;

      // Get yesterday's score
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayRecord = await this.prisma.propertyScoreHistory.findFirst({
        where: {
          listingId: listing.id,
          recordDate: yesterday,
        },
      });

      // Calculate score delta
      const scoreDelta = yesterdayRecord
        ? listing.flipVelocityScore - yesterdayRecord.flipVelocityScore
        : 0;

      // Determine score trend
      let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
      if (scoreDelta > 2) trend = 'UP';
      else if (scoreDelta < -2) trend = 'DOWN';

      // Calculate core metrics
      const coreMetrics = await this.coreMetricsCalculator.calculateCoreMetrics(listing);

      // Check if new to list (70+ threshold)
      const isNewToList =
        !yesterdayRecord && listing.flipVelocityScore >= 70;

      // Calculate appearance count (consecutive days at 70+)
      const appearanceCount = await this.calculateAppearanceCount(listing.id);

      // Record today's score
      const history = await this.prisma.propertyScoreHistory.create({
        data: {
          listingId: listing.id,
          recordDate: today,
          flipVelocityScore: listing.flipVelocityScore,
          opportunityScore: listing.opportunityScore,
          zipAbsorptionScore: listing.zipAbsorptionScore,
          renoScopeScore: listing.renoScopeScore,
          buyerPoolScore: listing.buyerPoolScore,
          modelARV: listing.modelARV,
          
          // Core metrics
          dom: coreMetrics.dom,
          domDelta: coreMetrics.domDelta,
          domTrend: coreMetrics.domTrend,
          
          listPrice: coreMetrics.listPrice,
          priceDropPct: coreMetrics.priceDropPct,
          priceDropVelocity: coreMetrics.priceDropVelocity,
          daysSinceLastPriceDrop: coreMetrics.daysSinceLastPriceDrop,
          isPriceDroppingAccelerated: coreMetrics.isPriceDroppingAccelerated,
          
          renoScopeScoreDelta: coreMetrics.renoScopeScoreDelta,
          conditionRiskFlagCount: coreMetrics.conditionRiskFlagCount,
          newConditionFlags: JSON.stringify(coreMetrics.newConditionFlags),
          conditionTrend: coreMetrics.conditionTrend,
          
          status: listing.status,
          remarksHash: coreMetrics.remarksHash,
          
          scoreDelta,
          trend,
          isNewToList,
          appearanceCount,
        },
      });

      recorded.push(history);
    }

    return recorded;
  }

  /**
   * Get score trends for all properties in a market
   */
  async getTrends(market: string, count: number = 100): Promise<PropertyScoreTrend[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get today's scores
    const todayScores = await this.prisma.propertyScoreHistory.findMany({
      where: {
        recordDate: today,
        listing: { market },
        flipVelocityScore: { gte: 40 }, // Only scores worth tracking
      },
      include: {
        listing: true,
      },
      orderBy: { flipVelocityScore: 'desc' },
      take: count,
    });

    const trends: PropertyScoreTrend[] = [];

    for (const score of todayScores) {
      const yesterdayData = await this.prisma.propertyScoreHistory.findFirst({
        where: {
          listingId: score.listingId,
          recordDate: {
            lt: today,
          },
        },
        orderBy: { recordDate: 'desc' },
      });

      const sevenDayHistory = await this.getSevenDayScores(
        score.listingId,
        today
      );

      trends.push({
        listingId: score.listingId,
        mlsNumber: score.listing.mlsNumber,
        address: score.listing.address,
        market: score.listing.market,
        today: {
          score: score.flipVelocityScore,
          dom: score.dom,
          listPrice: score.listPrice,
          status: score.status || 'Unknown',
        },
        yesterday: yesterdayData
          ? {
              score: yesterdayData.flipVelocityScore,
              dom: yesterdayData.dom,
              listPrice: yesterdayData.listPrice,
            }
          : undefined,
        scoreDelta: score.scoreDelta || 0,
        trend: score.trend as 'UP' | 'DOWN' | 'STABLE',
        
        // Core metrics
        domMetrics: {
          dom: score.dom,
          delta: score.domDelta,
          trend: (score.domTrend as 'INCREASING' | 'STABLE' | 'DECREASING' | null) || null,
        },
        priceMetrics: {
          price: score.listPrice,
          dropPct: score.priceDropPct,
          velocity: score.priceDropVelocity,
          daysSinceDrop: score.daysSinceLastPriceDrop,
          accelerating: score.isPriceDroppingAccelerated || false,
        },
        conditionMetrics: {
          scoreDelta: score.renoScopeScoreDelta,
          riskFlagCount: score.conditionRiskFlagCount || 0,
          newFlags: score.newConditionFlags ? JSON.parse(score.newConditionFlags) : [],
          trend: (score.conditionTrend as 'DETERIORATING' | 'STABLE' | 'IMPROVING' | null) || null,
        },
        
        isNewToList: score.isNewToList,
        appearanceCount: score.appearanceCount || 1,
        sevenDayHistory,
      });
    }

    return trends;
  }

  /**
   * Get top properties by DOM acceleration
   */
  async getTopDOMAccelerators(market: string, count: number = 5): Promise<PropertyScoreTrend[]> {
    const trends = await this.getTrends(market, 1000);
    return trends
      .filter(t => t.domMetrics.trend === 'INCREASING')
      .sort((a, b) => (b.domMetrics.delta || 0) - (a.domMetrics.delta || 0))
      .slice(0, count);
  }

  /**
   * Get top properties by price drop velocity
   */
  async getTopPriceDrovers(market: string, count: number = 5): Promise<PropertyScoreTrend[]> {
    const trends = await this.getTrends(market, 1000);
    return trends
      .filter(t => t.priceMetrics.velocity && t.priceMetrics.velocity < 0)
      .sort((a, b) => (a.priceMetrics.velocity || 0) - (b.priceMetrics.velocity || 0))
      .slice(0, count);
  }

  /**
   * Get properties with deteriorating condition
   */
  async getDeterioratingCondition(market: string, count: number = 5): Promise<PropertyScoreTrend[]> {
    const trends = await this.getTrends(market, 1000);
    return trends
      .filter(t => t.conditionMetrics.trend === 'DETERIORATING' || t.conditionMetrics.newFlags.length > 0)
      .sort((a, b) => (b.conditionMetrics.newFlags.length || 0) - (a.conditionMetrics.newFlags.length || 0))
      .slice(0, count);
  }

  /**
   * Get persistent high performers
   */
  async getPersistentHighPerformers(
    market: string,
    minConsecutiveDays: number = 3
  ): Promise<PropertyScoreTrend[]> {
    const trends = await this.getTrends(market, 1000);
    return trends
      .filter(
        t =>
          t.appearanceCount >= minConsecutiveDays &&
          (t.trend === 'UP' || t.trend === 'STABLE')
      )
      .sort((a, b) => (b.appearanceCount || 0) - (a.appearanceCount || 0))
      .slice(0, 10);
  }

  /**
   * Private helper: Calculate consecutive days at 70+
   */
  private async calculateAppearanceCount(listingId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let count = 0;
    let checkDate = new Date(today);

    while (count < 365) {
      const record = await this.prisma.propertyScoreHistory.findFirst({
        where: {
          listingId,
          recordDate: checkDate,
          flipVelocityScore: { gte: 70 },
        },
      });

      if (!record) break;

      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return count;
  }

  /**
   * Private helper: Get last 7 days of scores
   */
  private async getSevenDayScores(
    listingId: string,
    today: Date
  ): Promise<number[]> {
    const scores = await this.prisma.propertyScoreHistory.findMany({
      where: {
        listingId,
        recordDate: {
          gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          lte: today,
        },
      },
      orderBy: { recordDate: 'asc' },
    });

    return scores.map(s => s.flipVelocityScore);
  }
}

