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
import { RENOVATION_KEYWORDS } from '../config/markets';

interface Comp {
  mlsNumber: string;
  soldPrice: number;
  sqft: number;
  bedrooms?: number;
  bathrooms?: number;
  garageSpaces?: number | null;
  lotSqft?: number | null;
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
   * Calculate similarity weight: comps closer in size/features get higher weight
   * Boosts comps with matching garage count and similar lot size
   */
  private calculateSimilarityWeight(listing: Listing, comp: Comp): number {
    let weight = 1.0;

    // Sqft similarity: closer sqft = higher weight (0.5 to 1.5)
    if (listing.sqft && comp.sqft) {
      const sqftRatio = Math.min(listing.sqft, comp.sqft) / Math.max(listing.sqft, comp.sqft);
      weight *= 0.5 + sqftRatio;
    }

    // Garage match bonus
    if (listing.garageSpaces !== undefined && comp.garageSpaces !== undefined && comp.garageSpaces !== null) {
      if (listing.garageSpaces === comp.garageSpaces) {
        weight *= 1.2;
      }
    }

    // Lot size similarity bonus (if both have lot data, within 50% = bonus)
    if (listing.lotSqft && comp.lotSqft) {
      const lotRatio = Math.min(listing.lotSqft, comp.lotSqft) / Math.max(listing.lotSqft, comp.lotSqft);
      if (lotRatio > 0.5) {
        weight *= 1.0 + (lotRatio - 0.5);
      }
    }

    return weight;
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

    // Reject comps with bad sqft data or extreme outlier $/SF
    const validComps = comps.filter(c => c.sqft >= 400);
    if (validComps.length === 0) {
      return {
        modelARV: 0,
        confidenceLevel: 'LOW',
        compsUsedCount: 0,
        renovatedCompsCount: 0,
        avgPSFUsed: 0,
        details: 'No valid comps (all had bad sqft data)',
      };
    }

    // Remove $/SF outliers: reject comps > 3x the median $/SF
    const psfValues = validComps.map(c => c.soldPrice / c.sqft).sort((a, b) => a - b);
    const medianPSF = psfValues[Math.floor(psfValues.length / 2)];
    const maxPSF = medianPSF * 3;
    const cleanComps = validComps.filter(c => (c.soldPrice / c.sqft) <= maxPSF);

    if (cleanComps.length === 0) {
      return {
        modelARV: 0,
        confidenceLevel: 'LOW',
        compsUsedCount: 0,
        renovatedCompsCount: 0,
        avgPSFUsed: 0,
        details: 'No valid comps after outlier removal',
      };
    }

    // Classify comps as renovated or general
    // (use cleanComps from here on)
    const renovatedComps = cleanComps.filter(c => this.isRenovatedComp(c.remarks));
    const generalComps = cleanComps.filter(c => !this.isRenovatedComp(c.remarks));

    // Strategy: Try to use 5+ renovated comps (HIGH-RENOVATED)
    // Fall back to blend if fewer available
    let compsToUse: Comp[] = [];
    let confidenceLevel: ARVEstimationResult['confidenceLevel'] = 'LOW';

    if (renovatedComps.length >= 5) {
      compsToUse = renovatedComps.slice(0, this.MAX_COMPS_TO_USE);
      confidenceLevel = 'HIGH-RENOVATED';
    } else if (renovatedComps.length >= 2 && cleanComps.length >= 3) {
      // Blend renovated + general
      compsToUse = [...renovatedComps, ...generalComps.slice(0, this.MAX_COMPS_TO_USE - renovatedComps.length)].slice(
        0,
        this.MAX_COMPS_TO_USE,
      );
      confidenceLevel = 'MEDIUM-BLENDED';
    } else if (cleanComps.length >= 3) {
      compsToUse = cleanComps.slice(0, this.MAX_COMPS_TO_USE);
      confidenceLevel = renovatedComps.length === 0 ? 'MEDIUM-GENERAL' : 'MEDIUM-BLENDED';
    } else {
      compsToUse = cleanComps;
      confidenceLevel = 'LOW';
    }

    // Calculate weighted $/SF
    let totalWeight = 0;
    let totalWeightedPSF = 0;

    for (const comp of compsToUse) {
      const compPSF = comp.soldPrice / comp.sqft;
      const recencyWeight = this.calculateRecencyWeight(comp.soldDate);
      const proximityWeight = this.calculateProximityWeight(comp.distanceMiles);
      const similarityWeight = this.calculateSimilarityWeight(listing, comp);
      const compWeight = recencyWeight * proximityWeight * similarityWeight;

      totalWeight += compWeight;
      totalWeightedPSF += compPSF * compWeight;
    }

    const weightedPSF = totalWeightedPSF / totalWeight;
    const modelARV = Math.round(weightedPSF * listing.sqft);

    return {
      modelARV,
      confidenceLevel,
      compsUsedCount: compsToUse.length,
      renovatedCompsCount: renovatedComps.length,
      avgPSFUsed: Math.round(weightedPSF),
      details: `${compsToUse.length} comps (${renovatedComps.length} renovated) @ $${Math.round(weightedPSF)}/sf`,
    };
  }
}
