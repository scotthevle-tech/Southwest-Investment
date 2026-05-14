/**
 * Competitive Inventory Analysis
 * Shows market saturation at the estimated ARV
 * NOT included in Flip Velocity formula - for context only
 * Zero additional API calls - uses existing DB data only
 */

import { Listing } from '../types';

interface InventoryResult {
  competitiveInventoryCount: number;
  competitiveInventoryScore: number;
}

export class CompetitiveInventoryScorerService {
  /**
   * Count similar active listings in zip code within ARV range
   * ARV range: 90%-110% of estimated ARV
   */
  async calculate(
    listing: Listing,
    modelARV: number | undefined,
    similarActiveListingsCount: number,
  ): Promise<InventoryResult> {
    if (!modelARV) {
      return {
        competitiveInventoryCount: 0,
        competitiveInventoryScore: 50, // neutral default
      };
    }

    // Score based on inventory count
    let score = 0;
    if (similarActiveListingsCount <= 2) {
      score = 100; // Very little competition
    } else if (similarActiveListingsCount <= 5) {
      score = 80; // Light competition
    } else if (similarActiveListingsCount <= 10) {
      score = 60; // Moderate competition
    } else if (similarActiveListingsCount <= 15) {
      score = 40; // Heavy competition
    } else {
      score = 20; // Very saturated
    }

    return {
      competitiveInventoryCount: similarActiveListingsCount,
      competitiveInventoryScore: score,
    };
  }
}
