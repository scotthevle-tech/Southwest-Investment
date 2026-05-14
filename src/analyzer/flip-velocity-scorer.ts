/**
 * Flip Velocity Score - PRIMARY RANKING METRIC
 * Combines all scoring components into the master score that determines property priority
 *
 * Formula:
 * flipVelocityScore =
 *   (opportunityScore     * 0.40) +
 *   (zipAbsorptionScore   * 0.30) +
 *   (renoScopeScore       * 0.20) +
 *   (buyerPoolScore       * 0.10)
 *
 * All components normalized 0-100 before weighting
 * Result: 0-100 scale
 */

import { Listing, FlipVelocityResult } from '../types';
import { FLIP_VELOCITY_WEIGHTS, FLIP_VELOCITY_THRESHOLDS } from '../config/markets';

export class FlipVelocityScorerService {
  /**
   * Calculate composite Flip Velocity Score from all components
   */
  calculate(
    opportunityScore: number | undefined,
    zipAbsorptionScore: number | undefined,
    renoScopeScore: number | undefined,
    buyerPoolScore: number | undefined,
  ): FlipVelocityResult {
    // Default missing components to 50 (neutral)
    const opp = this.normalize(opportunityScore || 50);
    const zip = this.normalize(zipAbsorptionScore || 50);
    const reno = this.normalize(renoScopeScore || 50);
    const buyer = this.normalize(buyerPoolScore || 50);

    const flipVelocityScore = Math.round(
      opp * FLIP_VELOCITY_WEIGHTS.OPPORTUNITY +
        zip * FLIP_VELOCITY_WEIGHTS.ZIP_ABSORPTION +
        reno * FLIP_VELOCITY_WEIGHTS.RENO_SCOPE +
        buyer * FLIP_VELOCITY_WEIGHTS.BUYER_POOL,
    );

    let flipVelocityLevel: 'High Velocity' | 'Evaluate' | 'Track Only';
    if (flipVelocityScore >= FLIP_VELOCITY_THRESHOLDS.HIGH_VELOCITY_MIN) {
      flipVelocityLevel = 'High Velocity';
    } else if (flipVelocityScore >= FLIP_VELOCITY_THRESHOLDS.EVALUATE_MIN) {
      flipVelocityLevel = 'Evaluate';
    } else {
      flipVelocityLevel = 'Track Only';
    }

    return {
      flipVelocityScore,
      flipVelocityLevel,
      breakdown: {
        opportunityScore: Math.round(opp),
        zipAbsorptionScore: Math.round(zip),
        renoScopeScore: Math.round(reno),
        buyerPoolScore: Math.round(buyer),
      },
      weights: {
        opportunity: FLIP_VELOCITY_WEIGHTS.OPPORTUNITY,
        zipAbsorption: FLIP_VELOCITY_WEIGHTS.ZIP_ABSORPTION,
        renoScope: FLIP_VELOCITY_WEIGHTS.RENO_SCOPE,
        buyerPool: FLIP_VELOCITY_WEIGHTS.BUYER_POOL,
      },
    };
  }

  /**
   * Ensure score is within 0-100 range
   */
  private normalize(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
