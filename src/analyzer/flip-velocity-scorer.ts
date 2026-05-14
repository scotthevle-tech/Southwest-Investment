import { FlipVelocityResult } from '../types';
import { FLIP_VELOCITY_WEIGHTS, FLIP_VELOCITY_THRESHOLDS, SPREAD_SCORE_THRESHOLDS } from '../config/markets';

export class FlipVelocityScorerService {
  calculateSpreadScore(spreadPct: number | null | undefined): number {
    if (spreadPct === null || spreadPct === undefined || spreadPct <= 0) return 0;

    const t = SPREAD_SCORE_THRESHOLDS;
    if (spreadPct >= t.EXCELLENT.minPct) return t.EXCELLENT.score;
    if (spreadPct >= t.STRONG.minPct) return t.STRONG.score;
    if (spreadPct >= t.GOOD.minPct) return t.GOOD.score;
    if (spreadPct >= t.MARGINAL.minPct) return t.MARGINAL.score;
    if (spreadPct >= t.THIN.minPct) return t.THIN.score;
    return t.BREAK_EVEN.score;
  }

  calculate(
    opportunityScore: number | undefined,
    zipAbsorptionScore: number | undefined,
    renoScopeScore: number | undefined,
    buyerPoolScore: number | undefined,
    spreadPct?: number | null,
  ): FlipVelocityResult {
    const opp = this.normalize(opportunityScore || 50);
    const zip = this.normalize(zipAbsorptionScore || 50);
    const reno = this.normalize(renoScopeScore || 50);
    const buyer = this.normalize(buyerPoolScore || 50);
    const spread = this.normalize(this.calculateSpreadScore(spreadPct));

    const flipVelocityScore = Math.round(
      opp * FLIP_VELOCITY_WEIGHTS.OPPORTUNITY +
      zip * FLIP_VELOCITY_WEIGHTS.ZIP_ABSORPTION +
      spread * FLIP_VELOCITY_WEIGHTS.SPREAD +
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
        spreadScore: Math.round(spread),
        renoScopeScore: Math.round(reno),
        buyerPoolScore: Math.round(buyer),
      },
      weights: {
        opportunity: FLIP_VELOCITY_WEIGHTS.OPPORTUNITY,
        zipAbsorption: FLIP_VELOCITY_WEIGHTS.ZIP_ABSORPTION,
        spread: FLIP_VELOCITY_WEIGHTS.SPREAD,
        renoScope: FLIP_VELOCITY_WEIGHTS.RENO_SCOPE,
        buyerPool: FLIP_VELOCITY_WEIGHTS.BUYER_POOL,
      },
    };
  }

  private normalize(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
