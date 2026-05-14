/**
 * DOM Alert Service
 * Detects DOM milestones and status changes
 */

import { Listing } from '../types';
import { DOM_MILESTONES } from '../config/markets';

export interface DOMAlertResult {
  mlsNumber: string;
  dom: number;
  milestone: number;
  alertType: 'DOM_MILESTONE' | 'FAILED_CONTRACT_REACTIVATED';
  shouldAlert: boolean;
  message: string;
}

export class DOMAlertService {
  /**
   * Check if DOM has hit a milestone (30, 60, 90, 120, 180)
   */
  checkDOMMilestone(currentDOM: number | undefined, previousDOM: number | undefined): number | null {
    if (!currentDOM || !previousDOM) return null;

    // Check if we've crossed any milestone
    for (const milestone of DOM_MILESTONES) {
      if (previousDOM < milestone && currentDOM >= milestone) {
        return milestone;
      }
    }

    return null;
  }

  /**
   * Check if listing went from Pending/Withdrawn back to Active
   */
  checkFailedContractReactivation(previousStatus: string, currentStatus: string): boolean {
    const wasNotActive = ['Pending', 'Withdrawn', 'Contingent'].includes(previousStatus);
    const isNowActive = currentStatus === 'Active';
    return wasNotActive && isNowActive;
  }

  /**
   * Compare two listings for DOM/status changes
   */
  compareListings(previous: Listing, current: Listing): DOMAlertResult[] {
    const alerts: DOMAlertResult[] = [];

    // Check for failed contract reactivation
    if (this.checkFailedContractReactivation(previous.status, current.status)) {
      alerts.push({
        mlsNumber: current.mlsNumber,
        dom: current.dom || 0,
        milestone: 0,
        alertType: 'FAILED_CONTRACT_REACTIVATED',
        shouldAlert: true,
        message: `${current.address} back to Active (was ${previous.status})`,
      });
    }

    // Check for DOM milestone
    const milestoneHit = this.checkDOMMilestone(current.dom, previous.dom);
    if (milestoneHit) {
      alerts.push({
        mlsNumber: current.mlsNumber,
        dom: current.dom || 0,
        milestone: milestoneHit,
        alertType: 'DOM_MILESTONE',
        shouldAlert: true,
        message: `${current.address} hit ${milestoneHit} DOM milestone`,
      });
    }

    return alerts;
  }
}
