/**
 * Zip Absorption Score Calculation
 * Measures: Will it sell fast in this specific zip?
 * Feeds 30% of Flip Velocity Score
 *
 * Data needed: Sold comps in zip from last 90 days (DOM at sale, count)
 */

import { Listing, ZipAbsorptionResult } from '../types';
import { ZIP_ABSORPTION_THRESHOLDS } from '../config/markets';

interface SoldComp {
  domAtSale: number;
}

export class ZipAbsorptionScorerService {
  /**
   * Calculate zip absorption score based on 90-day sold data
   */
  async calculate(
    listing: Listing,
    soldCompsIn90Days: SoldComp[],
    fallbackCityAvgDOM?: number,
    fallbackCityVelocity?: number,
  ): Promise<ZipAbsorptionResult> {
    const hasEnoughComps = soldCompsIn90Days.length >= ZIP_ABSORPTION_THRESHOLDS.MIN_COMPS_FOR_ZIP;

    if (!hasEnoughComps) {
      // Fallback to city/market average with LOW confidence flag
      const domScore = this.scoreDOMSpeed(fallbackCityAvgDOM);
      const velocityScore = this.scoreVelocity(fallbackCityVelocity);

      return {
        zipAbsorptionScore: Math.round((domScore * 0.6 + velocityScore * 0.4) * 0.7), // Downweight confidence
        zipMedianDOM: fallbackCityAvgDOM || 60,
        zipSalesVelocity: fallbackCityVelocity || 1.5,
        zipSalesCount90d: soldCompsIn90Days.length,
        zipDataConfidence: 'LOW',
      };
    }

    // Calculate metrics from zip data
    const doms = soldCompsIn90Days.map(c => c.domAtSale).sort((a, b) => a - b);
    const zipMedianDOM = doms[Math.floor(doms.length / 2)];
    const zipSalesVelocity = soldCompsIn90Days.length / 3; // sales per month

    const domScore = this.scoreDOMSpeed(zipMedianDOM);
    const velocityScore = this.scoreVelocity(zipSalesVelocity);

    const zipAbsorptionScore = Math.round(domScore * 0.6 + velocityScore * 0.4);

    const confidence =
      soldCompsIn90Days.length >= 10 ? 'HIGH' : soldCompsIn90Days.length >= 5 ? 'MEDIUM' : 'LOW';

    return {
      zipAbsorptionScore,
      zipMedianDOM,
      zipSalesVelocity,
      zipSalesCount90d: soldCompsIn90Days.length,
      zipDataConfidence: confidence,
    };
  }

  /**
   * Score DOM speed: How fast are properties selling?
   * 0-100 scale
   */
  private scoreDOMSpeed(domDays: number | undefined): number {
    if (!domDays) return 50;

    if (domDays <= ZIP_ABSORPTION_THRESHOLDS.VERY_FAST_DOM) return 100; // under 3 weeks
    if (domDays <= ZIP_ABSORPTION_THRESHOLDS.FAST_DOM) return 80; // under 5 weeks
    if (domDays <= ZIP_ABSORPTION_THRESHOLDS.MODERATE_DOM) return 60; // under 7 weeks
    if (domDays <= ZIP_ABSORPTION_THRESHOLDS.SLOW_DOM) return 40; // under 11 weeks
    return 20; // slow zip
  }

  /**
   * Score sales velocity: How many properties are selling per month?
   * 0-100 scale
   */
  private scoreVelocity(salesPerMonth: number | undefined): number {
    if (!salesPerMonth) return 50;

    if (salesPerMonth >= ZIP_ABSORPTION_THRESHOLDS.VERY_FAST_VELOCITY) return 100;
    if (salesPerMonth >= ZIP_ABSORPTION_THRESHOLDS.FAST_VELOCITY) return 75;
    if (salesPerMonth >= ZIP_ABSORPTION_THRESHOLDS.MODERATE_VELOCITY) return 50;
    return 25;
  }
}
