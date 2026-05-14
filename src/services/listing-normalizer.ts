/**
 * Listing Normalizer
 * Converts raw MLS data to standard Listing format
 * Applies hard filters and flags invalid data
 */

import { ConnectorRawListing, Listing } from '../types';
import { HARD_FILTERS, MARKETS } from '../config/markets';

interface NormalizationResult {
  listing: Listing | null;
  passed: boolean;
  failures: string[];
  warnings: string[];
}

export class ListingNormalizerService {
  /**
   * Normalize and validate a raw listing
   */
  normalize(rawListing: ConnectorRawListing, market: string): NormalizationResult {
    const failures: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!rawListing.mlsNumber) {
      failures.push('Missing MLS number');
    }
    if (!rawListing.address) {
      failures.push('Missing address');
    }
    if (!rawListing.city) {
      failures.push('Missing city');
    }
    if (rawListing.bedrooms < HARD_FILTERS.MIN_BEDROOMS) {
      failures.push(`Bedrooms ${rawListing.bedrooms} < ${HARD_FILTERS.MIN_BEDROOMS} minimum`);
    }
    if (!rawListing.bathrooms) {
      failures.push('Missing bathrooms');
    }

    // Hard filter: List price
    if (rawListing.listPrice > HARD_FILTERS.MAX_LIST_PRICE) {
      failures.push(`List price $${rawListing.listPrice} exceeds $${HARD_FILTERS.MAX_LIST_PRICE} max`);
    }

    // Hard filter: Property type
    if (rawListing.propertyType !== HARD_FILTERS.PROPERTY_TYPE) {
      failures.push(`Property type "${rawListing.propertyType}" not ${HARD_FILTERS.PROPERTY_TYPE}`);
    }

    // Hard filter: Status (accept Active and Active Under Contract)
    const validStatuses = ['Active', 'Active Under Contract'];
    if (!validStatuses.includes(rawListing.status)) {
      failures.push(`Status "${rawListing.status}" not active`);
    }

    // Hard filter: HOA
    if (rawListing.hoaMonthly !== undefined && rawListing.hoaMonthly > HARD_FILTERS.MAX_HOA_MONTHLY) {
      failures.push(`HOA $${rawListing.hoaMonthly}/mo exceeds $${HARD_FILTERS.MAX_HOA_MONTHLY} max`);
    }

    // Hard filter: Water source (reject well/private/spring only)
    if (rawListing.waterSource) {
      const ws = rawListing.waterSource.toLowerCase();
      const rejected = HARD_FILTERS.WATER_SOURCE_REJECT.some(r => ws.includes(r));
      if (rejected) {
        failures.push(`Water source "${rawListing.waterSource}" is non-municipal`);
      }
    }

    // Hard filter: Mobile/manufactured homes
    if (rawListing.remarks) {
      const remarksLower = rawListing.remarks.toLowerCase();
      const isMobile = HARD_FILTERS.MOBILE_MANUFACTURED_REJECT.some(kw => remarksLower.includes(kw));
      if (isMobile) {
        failures.push('Mobile/manufactured home detected in remarks');
      }

      // Hard filter: Age-restricted communities (keyword backup)
      const ageRestricted = ['55+', '55 and over', '55 & over', 'age restricted',
        'age-restricted', 'senior community', 'adult community', 'active adult'].some(kw => remarksLower.includes(kw));
      if (ageRestricted) {
        failures.push('Age-restricted community detected in remarks');
      }
    }

    // Warnings (non-blocking)
    if (!rawListing.sqft) {
      warnings.push('Missing sqft - ARV estimation will be impossible');
    }
    if (!rawListing.yearBuilt) {
      warnings.push('Missing year built - reno risk assessment incomplete');
    }
    if (rawListing.hoaMonthly === undefined || rawListing.hoaMonthly === null) {
      warnings.push('HOA amount unknown');
    }
    if (!rawListing.sewerType) {
      warnings.push('Sewer type unknown - reno scope incomplete');
    }
    if (!rawListing.remarks) {
      warnings.push('No remarks - keyword analysis impossible');
    }

    // If any failures, return null listing
    if (failures.length > 0) {
      return {
        listing: null,
        passed: false,
        failures,
        warnings,
      };
    }

    // Create normalized listing
    const listing: Listing = {
      id: `${market}-${rawListing.mlsNumber}`, // Generate ID
      mlsNumber: rawListing.mlsNumber!,
      market: market as 'Las Vegas' | 'St. George' | 'Cedar City',
      address: rawListing.address!,
      city: rawListing.city!,
      zipCode: rawListing.zipCode,
      county: rawListing.county,
      listPrice: rawListing.listPrice,
      originalListPrice: rawListing.originalListPrice,
      sqft: rawListing.sqft,
      bedrooms: rawListing.bedrooms,
      bathrooms: rawListing.bathrooms,
      garageSpaces: rawListing.garageSpaces,
      lotSqft: rawListing.lotSqft,
      yearBuilt: rawListing.yearBuilt,
      propertyType: rawListing.propertyType,
      status: rawListing.status,
      isActive: rawListing.status === 'Active',
      dom: rawListing.dom,
      remarks: rawListing.remarks,
      hoaMonthly: rawListing.hoaMonthly,
      waterSource: rawListing.waterSource,
      sewerType: rawListing.sewerType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      listing,
      passed: true,
      failures: [],
      warnings,
    };
  }

  /**
   * Batch normalize listings
   */
  normalizeBatch(rawListings: ConnectorRawListing[], market: string): {
    normalized: Listing[];
    failed: Array<{ mls: string; failures: string[] }>;
    warnings: Array<{ mls: string; warnings: string[] }>;
  } {
    const normalized: Listing[] = [];
    const failed: Array<{ mls: string; failures: string[] }> = [];
    const warnings: Array<{ mls: string; warnings: string[] }> = [];

    for (const raw of rawListings) {
      const result = this.normalize(raw, market);
      if (result.passed && result.listing) {
        normalized.push(result.listing);
      } else {
        failed.push({
          mls: raw.mlsNumber || 'unknown',
          failures: result.failures,
        });
      }

      if (result.warnings.length > 0) {
        warnings.push({
          mls: raw.mlsNumber || 'unknown',
          warnings: result.warnings,
        });
      }
    }

    return { normalized, failed, warnings };
  }
}
