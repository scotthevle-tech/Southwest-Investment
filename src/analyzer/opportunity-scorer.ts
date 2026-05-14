/**
 * Opportunity Score Calculation
 * Measures: Can we buy it right?
 * Components: Price vs PSF, DOM vs zip avg, price reductions, motivated keywords, property age, market flags
 */

import { Listing, OpportunityScorerResult } from '../types';
import { MOTIVATED_SELLER_KEYWORDS } from '../config/markets';

export class OpportunityScorerService {
  /**
   * Component 1: Price vs Zip $/SF (30 pts max)
   * Compares subject price/sf to market average
   */
  private scorePricePSF(
    subjectPrice: number,
    subjectSqft: number | undefined,
    marketAvgPSF: number | undefined,
  ): { score: number; detail: string } {
    if (!subjectSqft || !marketAvgPSF) {
      return { score: 10, detail: 'Missing data; neutral score' };
    }

    const subjectPSF = subjectPrice / subjectSqft;
    const discount = (marketAvgPSF - subjectPSF) / marketAvgPSF;

    let score = 0;
    let detail = '';

    if (discount >= 0.2) {
      score = 30;
      detail = `>=20% below market ($${subjectPSF.toFixed(0)}/sf vs $${marketAvgPSF.toFixed(0)}/sf)`;
    } else if (discount >= 0.1) {
      score = 20;
      detail = `>=10% below market ($${subjectPSF.toFixed(0)}/sf vs $${marketAvgPSF.toFixed(0)}/sf)`;
    } else if (discount >= 0) {
      score = 10;
      detail = `0-10% below market ($${subjectPSF.toFixed(0)}/sf vs $${marketAvgPSF.toFixed(0)}/sf)`;
    } else {
      score = 0;
      detail = `Above market ($${subjectPSF.toFixed(0)}/sf vs $${marketAvgPSF.toFixed(0)}/sf)`;
    }

    return { score, detail };
  }

  /**
   * Component 2: DOM vs Zip Average (20 pts max)
   * Longer DOM = higher motivation
   */
  private scoreDOMVsZip(
    subjectDOM: number | undefined,
    zipAvgDOM: number | undefined,
  ): { score: number; detail: string } {
    if (!subjectDOM || !zipAvgDOM || zipAvgDOM === 0) {
      return { score: 10, detail: 'DOM data incomplete; neutral score' };
    }

    const ratio = subjectDOM / zipAvgDOM;
    let score = 0;
    let detail = '';

    if (ratio >= 2.0) {
      score = 20;
      detail = `>=2.0x zip average (${subjectDOM}d vs ${zipAvgDOM.toFixed(0)}d avg)`;
    } else if (ratio >= 1.5) {
      score = 15;
      detail = `>=1.5x zip average (${subjectDOM}d vs ${zipAvgDOM.toFixed(0)}d avg)`;
    } else if (ratio >= 1.0) {
      score = 10;
      detail = `>=1.0x zip average (${subjectDOM}d vs ${zipAvgDOM.toFixed(0)}d avg)`;
    } else {
      score = 0;
      detail = `Below zip average (${subjectDOM}d vs ${zipAvgDOM.toFixed(0)}d avg) - less motivated`;
    }

    return { score, detail };
  }

  /**
   * Component 3: Price Reductions (15 pts max)
   * Each price reduction = 5 pts, capped at 15
   */
  private scorePriceReductions(
    reductionCount: number,
    originalPrice: number | undefined,
    currentPrice: number,
  ): { score: number; detail: string } {
    const score = Math.min(reductionCount * 5, 15);
    const totalDropPct =
      originalPrice && originalPrice > currentPrice
        ? ((originalPrice - currentPrice) / originalPrice) * 100
        : 0;

    const detail = `${reductionCount} reduction${reductionCount !== 1 ? 's' : ''}${totalDropPct > 0 ? ` (${totalDropPct.toFixed(1)}% total drop)` : ''}`;

    return { score, detail };
  }

  /**
   * Component 4: Motivated Seller Keywords (20 pts max)
   * HIGH_SIGNAL: 5 pts each (cap 20)
   * MEDIUM_SIGNAL: 2 pts each
   */
  private scoreMotivatedKeywords(remarks: string | undefined): {
    score: number;
    keywords: string[];
    detail: string;
  } {
    if (!remarks) {
      return { score: 0, keywords: [], detail: 'No remarks' };
    }

    const remarksLower = remarks.toLowerCase();
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of MOTIVATED_SELLER_KEYWORDS.HIGH_SIGNAL) {
      if (remarksLower.includes(keyword)) {
        matchedKeywords.push(keyword);
        score = Math.min(score + 5, 20); // Cap at 20
      }
    }

    for (const keyword of MOTIVATED_SELLER_KEYWORDS.MEDIUM_SIGNAL) {
      if (remarksLower.includes(keyword)) {
        matchedKeywords.push(keyword);
        score += 2;
      }
    }

    const detail = matchedKeywords.length > 0 ? matchedKeywords.join(', ') : 'No motivated signals';
    return { score, keywords: matchedKeywords, detail };
  }

  /**
   * Component 5: Property Age + Condition Keywords (10 pts max)
   */
  private scorePropertyAge(yearBuilt: number | undefined, remarks: string | undefined): {
    score: number;
    detail: string;
  } {
    let score = 0;
    let detail = '';

    if (yearBuilt) {
      if (yearBuilt < 1975) {
        score = 8;
        detail = `Pre-1975 (${yearBuilt}) - older property`;
      } else if (yearBuilt < 1990) {
        score = 5;
        detail = `Pre-1990 (${yearBuilt}) - moderate age`;
      }
    }

    const conditionKeywords = ['original', 'vintage', 'dated', 'carpet', 'popcorn', 'builder grade', 'original fixtures'];
    const remarksLower = remarks?.toLowerCase() || '';
    const matchedConditions = conditionKeywords.filter(k => remarksLower.includes(k)).length;

    if (matchedConditions > 0) {
      const conditionScore = Math.min(matchedConditions * 2, 5);
      score = Math.min(score + conditionScore, 10);
      detail += `${detail ? ' + ' : ''}Condition signals: ${matchedConditions} keyword${matchedConditions !== 1 ? 's' : ''}`;
    }

    return { score, detail };
  }

  /**
   * Component 6: Market Flags (+/- 5 pts)
   * Pool, HOA unknown, estate/probate/reo, ARV in sweet spot
   */
  private scoreMarketFlags(
    listing: Listing,
    arvInSweetSpot: boolean,
  ): { score: number; flags: string[]; detail: string } {
    let score = 0;
    const flags: string[] = [];

    // Pool flag (LV and SG only)
    if (['Las Vegas', 'St. George'].includes(listing.market)) {
      if (listing.remarks?.toLowerCase().includes('pool')) {
        flags.push('Pool in remarks (LV/SG)');
      }
    }

    // HOA verification
    if (listing.hoaMonthly === null || listing.hoaMonthly === undefined) {
      flags.push('HOA unverified');
    }

    // Estate/probate/reo bonus
    const remarks = listing.remarks?.toLowerCase() || '';
    if (remarks.includes('estate') || remarks.includes('probate') || remarks.includes('reo')) {
      score += 2;
      flags.push('Estate/Probate/REO (+2 pts)');
    }

    // ARV sweet spot bonus
    if (arvInSweetSpot) {
      score += 3;
      flags.push('ARV in buyer pool sweet spot (+3 pts)');
    }

    const detail = flags.length > 0 ? flags.join('; ') : 'No special flags';
    return { score, flags, detail };
  }

  /**
   * Main: Calculate full Opportunity Score (0-100)
   */
  async calculate(
    listing: Listing,
    marketAvgPSF: number | undefined,
    zipAvgDOM: number | undefined,
    arvInSweetSpot: boolean = false,
  ): Promise<OpportunityScorerResult> {
    const pricePSF = this.scorePricePSF(listing.listPrice, listing.sqft, marketAvgPSF);
    const domScore = this.scoreDOMVsZip(listing.dom, zipAvgDOM);
    const reductions = this.scorePriceReductions(
      listing.priceReductionCount || 0,
      listing.originalListPrice,
      listing.listPrice,
    );
    const motivated = this.scoreMotivatedKeywords(listing.remarks);
    const age = this.scorePropertyAge(listing.yearBuilt, listing.remarks);
    const flags = this.scoreMarketFlags(listing, arvInSweetSpot);

    const totalScore = Math.min(
      pricePSF.score + domScore.score + reductions.score + motivated.score + age.score + flags.score,
      100,
    );

    return {
      opportunityScore: Math.round(totalScore),
      breakdown: {
        pricePSFScore: pricePSF.score,
        domScore: domScore.score,
        priceReductionScore: reductions.score,
        motivatedSellerScore: motivated.score,
        propertyAgeScore: age.score,
        marketFlagsScore: flags.score,
      },
      motivatedKeywords: motivated.keywords,
    };
  }
}
