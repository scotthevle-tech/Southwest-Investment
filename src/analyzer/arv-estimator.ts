/**
 * ARV Estimation Service
 * Estimates After Renovation Value based on comparable renovated/updated sales
 *
 * Strategy:
 * 1. Try to find HIGH-RENOVATED comps (5+ with renovated keywords) = HIGH confidence
 * 2. If fewer, blend with general comps: 2+ renovated = MEDIUM-BLENDED, 0-1 = MEDIUM-GENERAL
 * 3. If <3 total = LOW confidence (flag prominently)
 *
 * Weighting:
 * - Recency weight: properties sold more recently = higher weight
 * - Proximity weight: nearby properties = higher weight (if lat/lng available)
 * - Weighted $/SF calculation
 */

import { Listing, ARVEstimationResult } from '../types';
import { RENOVATION_KEYWORDS, HARD_FILTERS } from '../config/markets';

interface Comp {
  mlsNumber: string;
  soldPrice: number;
  sqft: number;
  soldDate: Date;
  remarks?: string;
  distanceMiles?: number;
}

export class ARVEstimatorService {
  private readonly MIN_COMPS_FOR_CONFIDENCE = 3;
  private readonly MAX_COMPS_TO_USE = 10;
  private readonly RECENT_DAYS_WEIGHT_THRESHOLD = 180;

  /**
   * Check if comp remarks contain renovation keywords
   */
  private isRenovatedComp(remarks: string | undefined): boolean {
    if (!remarks) return false;
    const remarksLower = remarks.toLowerCase();
    return RENOVATION_KEYWORDS.some(keyword => remarksLower.includes(keyword));
  }

  /**
   * Calculate recency weight: more recent = higher weight
   * Formula: 1 + ((180 - daysAgo) / 180)
   */
  private calculateRecencyWeight(soldDate: Date): number {
    const daysAgo = Math.floor((Date.now() - soldDate.getTime()) / (1000 * 60 * 60 * 24));
    return 1 + ((this.RECENT_DAYS_WEIGHT_THRESHOLD - daysAgo) / this.RECENT_DAYS_WEIGHT_THRESHOLD);
  }

  /**
   * Calculate proximity weight: closer = higher weight
   * Formula: 1 + ((1.5 - distanceMiles) / 1.5)
   */
  private calculateProximityWeight(distanceMiles: number | undefined): number {
    if (!distanceMiles) return 1;
    return 1 + ((1.5 - distanceMiles) / 1.5);
  }

  /**
   * Main: Estimate ARV using comp data
   */
  async calculate(
    listing: Listing,
    comps: Comp[],
  ): Promise<ARVEstimationResult> {
    if (listing.sqft === undefined || listing.sqft === 0) {
      return {
        modelARV: 0,
        confidenceLevel: 'LOW',
        compsUsedCount: 0,
        renovatedCompsCount: 0,
        avgPSFUsed: 0,
        details: 'Subject property sqft unknown',
      };
    }

    if (comps.length === 0) {
      return {
        modelARV: 0,
        confidenceLevel: 'LOW',
        compsUsedCount: 0,
        renovatedCompsCount: 0,
        avgPSFUsed: 0,
        details: 'No comparable sales found',
      };
    }

    // Classify comps as renovated or general
    const renovatedComps = comps.filter(c => this.isRenovatedComp(c.remarks));
    const generalComps = comps.filter(c => !this.isRenovatedComp(c.remarks));

    // Strategy: Try to use 5+ renovated comps (HIGH-RENOVATED)
    // Fall back to blend if fewer available
    let compsToUse: Comp[] = [];
    let confidenceLevel: ARVEstimationResult['confidenceLevel'] = 'LOW';

    if (renovatedComps.length >= 5) {
      compsToUse = renovatedComps.slice(0, this.MAX_COMPS_TO_USE);
      confidenceLevel = 'HIGH-RENOVATED';
    } else if (renovatedComps.length >= 2 && comps.length >= 3) {
      // Blend renovated + general
      compsToUse = [...renovatedComps, ...generalComps.slice(0, this.MAX_COMPS_TO_USE - renovatedComps.length)].slice(
        0,
        this.MAX_COMPS_TO_USE,
      );
      confidenceLevel = 'MEDIUM-BLENDED';
    } else if (comps.length >= 3) {
      compsToUse = comps.slice(0, this.MAX_COMPS_TO_USE);
      confidenceLevel = renovatedComps.length === 0 ? 'MEDIUM-GENERAL' : 'MEDIUM-BLENDED';
    } else {
      compsToUse = comps;
      confidenceLevel = 'LOW';
    }

    // Calculate weighted $/SF
    let totalWeight = 0;
    let totalWeightedPSF = 0;

    for (const comp of compsToUse) {
      const compPSF = comp.soldPrice / comp.sqft;
      const recencyWeight = this.calculateRecencyWeight(comp.soldDate);
      const proximityWeight = this.calculateProximityWeight(comp.distanceMiles);
      const compWeight = recencyWeight * proximityWeight;

      totalWeight += compWeight;
      totalWeightedPSF += compPSF * compWeight;
    }

    const weightedPSF = totalWeightedPSF / totalWeight;
    const modelARV = Math.round(weightedPSF * listing.sqft);

    // Cap at hard maximum
    const cappedARV = Math.min(modelARV, HARD_FILTERS.MAX_ARV_TARGET);

    return {
      modelARV: cappedARV,
      confidenceLevel,
      compsUsedCount: compsToUse.length,
      renovatedCompsCount: renovatedComps.length,
      avgPSFUsed: Math.round(weightedPSF),
      details: `${compsToUse.length} comps (${renovatedComps.length} renovated) @ $${Math.round(weightedPSF)}/sf`,
    };
  }
}
