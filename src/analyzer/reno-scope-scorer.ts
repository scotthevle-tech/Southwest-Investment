/**
 * Reno Scope Score Calculation
 * Measures: Is the renovation predictable and low-risk?
 * Feeds 20% of Flip Velocity Score
 *
 * Starts at 100, deducts for risk factors
 * Result: 0-100 score + risk level (LOW/MEDIUM/HIGH) + specific flags
 */

import { Listing, RenoScopeResult } from '../types';
import { RENO_SCOPE_PENALTIES, RENO_SCOPE_BONUSES } from '../config/markets';

export class RenoScopeScorerService {
  /**
   * Calculate full reno scope score
   */
  calculate(listing: Listing): RenoScopeResult {
    let score = 100;
    const riskFlags: string[] = [];
    const remarks = listing.remarks?.toLowerCase() || '';

    // Year built risk
    if (listing.yearBuilt && listing.yearBuilt < 1978) {
      score -= RENO_SCOPE_PENALTIES.PRE_1978;
      riskFlags.push('Pre-1978 -- potential lead paint remediation');
    } else if (listing.yearBuilt && listing.yearBuilt < 1990) {
      score -= RENO_SCOPE_PENALTIES.PRE_1990;
      riskFlags.push('Pre-1990 -- likely HVAC replacement needed');
    }

    // Pool risk (LV and SG only)
    if (['Las Vegas', 'St. George'].includes(listing.market)) {
      if (remarks.includes('pool')) {
        score -= RENO_SCOPE_PENALTIES.POOL;
        riskFlags.push('Pool -- mechanical condition unknown');
      }
    }

    // Unknown sewer risk
    if (!listing.sewerType || listing.sewerType === 'Unknown') {
      score -= RENO_SCOPE_PENALTIES.UNKNOWN_SEWER;
      riskFlags.push('Sewer status unverified');
    }

    // Structural/system risk keywords
    const riskItems = [
      { word: 'foundation', penalty: RENO_SCOPE_PENALTIES.FOUNDATION, flag: 'Foundation mentioned -- structural risk' },
      { word: 'roof', penalty: RENO_SCOPE_PENALTIES.ROOF, flag: 'Roof mentioned -- verify age/condition' },
      { word: 'electrical', penalty: RENO_SCOPE_PENALTIES.ELECTRICAL, flag: 'Electrical mentioned -- may need work' },
      { word: 'plumbing', penalty: RENO_SCOPE_PENALTIES.PLUMBING, flag: 'Plumbing mentioned -- unknown scope' },
      { word: 'mold', penalty: RENO_SCOPE_PENALTIES.MOLD, flag: 'Mold mentioned -- remediation risk' },
      { word: 'fire damage', penalty: RENO_SCOPE_PENALTIES.FIRE_DAMAGE, flag: 'Fire damage -- significant scope risk' },
      { word: 'water damage', penalty: RENO_SCOPE_PENALTIES.WATER_DAMAGE, flag: 'Water damage -- unknown scope' },
      { word: 'as-is', penalty: RENO_SCOPE_PENALTIES.AS_IS, flag: 'As-is -- seller disclosing unknowns' },
    ];

    for (const item of riskItems) {
      if (remarks.includes(item.word)) {
        score -= item.penalty;
        riskFlags.push(item.flag);
      }
    }

    // Positive cosmetic signals
    const cosmeticKeywords = ['paint', 'flooring', 'carpet', 'cosmetic', 'tlc', 'updating', 'dated', 'original'];
    const matchedCosmetic = cosmeticKeywords.filter(k => remarks.includes(k)).length;

    if (matchedCosmetic >= 2) {
      score += RENO_SCOPE_BONUSES.COSMETIC_POSITIVE;
      riskFlags.push('POSITIVE: Cosmetic scope signals -- paint/floors likely');
    }

    // Normalize score to 0-100
    const finalScore = Math.max(0, Math.min(100, score));

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (finalScore >= 80) {
      riskLevel = 'LOW';
    } else if (finalScore >= 60) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'HIGH';
    }

    return {
      renoScopeScore: finalScore,
      renoRiskLevel: riskLevel,
      renoRiskFlags: riskFlags,
    };
  }
}
