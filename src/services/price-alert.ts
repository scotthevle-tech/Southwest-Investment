/**
 * Price Alert Service
 * Detects price reductions and generates alerts
 */

import { Listing } from '../types';

export interface PriceAlertResult {
  mlsNumber: string;
  previousPrice: number;
  newPrice: number;
  dropAmount: number;
  dropPct: number;
  alertType: 'STANDARD_DROP' | 'LARGE_DROP_5_PLUS';
  shouldAlert: boolean;
}

export class PriceAlertService {
  /**
   * Check if price drop warrants an alert
   * Standard alert: any drop
   * Priority alert: >=5% drop
   */
  checkPriceDrop(previousPrice: number, currentPrice: number): PriceAlertResult | null {
    const dropAmount = previousPrice - currentPrice;
    const dropPct = (dropAmount / previousPrice) * 100;

    // Only alert if price actually dropped
    if (dropAmount <= 0) {
      return null;
    }

    const shouldAlert = dropPct >= 5; // Alert threshold
    const alertType = dropPct >= 5 ? 'LARGE_DROP_5_PLUS' : 'STANDARD_DROP';

    return {
      mlsNumber: '', // Will be set by caller
      previousPrice,
      newPrice: currentPrice,
      dropAmount,
      dropPct,
      alertType,
      shouldAlert,
    };
  }

  /**
   * Compare two listings for price changes
   */
  compareListings(previous: Listing, current: Listing): PriceAlertResult | null {
    if (previous.listPrice === current.listPrice) {
      return null;
    }

    const alert = this.checkPriceDrop(previous.listPrice, current.listPrice);
    if (alert) {
      alert.mlsNumber = current.mlsNumber;
    }
    return alert;
  }
}
