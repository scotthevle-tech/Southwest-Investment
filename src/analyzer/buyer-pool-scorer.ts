/**
 * Buyer Pool Score Calculation
 * Measures: Is the ARV in peak buyer demand range for this market?
 * Feeds 10% of Flip Velocity Score
 *
 * Uses market-specific ARV ranges updated quarterly
 */

import { Listing, BuyerPoolResult } from '../types';
import { BUYER_POOL_RANGES } from '../config/markets';

export class BuyerPoolScorerService {
  /**
   * Calculate buyer pool score based on estimated ARV
   */
  calculate(modelARV: number | undefined, market: string): BuyerPoolResult {
    if (!modelARV) {
      return {
        buyerPoolScore: 50,
        buyerPoolLabel: 'ARV not estimated; neutral score',
      };
    }

    const ranges = BUYER_POOL_RANGES[market as keyof typeof BUYER_POOL_RANGES];

    if (!ranges) {
      return {
        buyerPoolScore: 30,
        buyerPoolLabel: `Unknown market: ${market}`,
      };
    }

    const match = ranges.find(r => modelARV >= r.min && modelARV <= r.max);

    if (!match) {
      return {
        buyerPoolScore: 30,
        buyerPoolLabel: `ARV $${modelARV.toLocaleString()} outside tracked ranges`,
      };
    }

    return {
      buyerPoolScore: match.score,
      buyerPoolLabel: match.label,
    };
  }
}
