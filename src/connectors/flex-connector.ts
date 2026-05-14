/**
 * Flex MLS Connector
 * For St. George (Washington County, UT) and Cedar City (Iron County, UT)
 *
 * One FlexConnector instance per market (Washington, Iron)
 *
 * TO IMPLEMENT:
 * 1. Swap placeholder URL/auth for actual Flex API endpoints
 * 2. Implement pagination for large result sets
 * 3. Map Flex field names to our ConnectorRawListing interface
 * 4. Handle Flex-specific error codes
 */

import axios, { AxiosInstance } from 'axios';
import { BaseConnector, ConnectorConfig } from './base-connector';
import { ConnectorRawListing } from '../types';

export class FlexConnector extends BaseConnector {
  private axiosInstance: AxiosInstance;

  constructor(config: ConnectorConfig) {
    super(config);
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Fetch new listings from Flex saved search
   */
  async fetchNewListings(): Promise<ConnectorRawListing[]> {
    try {
      if (!this.validateConfig()) {
        throw new Error(`${this.config.market} Flex config incomplete`);
      }

      // TODO: Implement actual Flex API call
      // Placeholder: return empty array
      console.log(`[Flex-${this.config.market}] Fetching new listings for saved search ${this.config.savedSearchId}`);

      this.updateStatus(true);
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus(false, errorMessage);
      console.error(`[Flex-${this.config.market}] Error fetching listings:`, errorMessage);
      throw error;
    }
  }

  /**
   * Fetch delta check (price + status only, fast)
   */
  async fetchDeltaCheck(): Promise<
    Array<{
      mlsNumber: string;
      listPrice: number;
      status: string;
      dom: number;
    }>
  > {
    try {
      if (!this.validateConfig()) {
        throw new Error(`${this.config.market} Flex config incomplete`);
      }

      // TODO: Implement actual Flex API call for delta check
      // Placeholder: return empty array
      console.log(`[Flex-${this.config.market}] Fetching delta check`);

      this.updateStatus(true);
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus(false, errorMessage);
      console.error(`[Flex-${this.config.market}] Error in delta check:`, errorMessage);
      throw error;
    }
  }

  /**
   * Normalize Flex raw response to our standard format
   * TODO: Implement field mapping
   */
  private normalizeListing(rawListing: Record<string, unknown>): ConnectorRawListing {
    // TODO: Map Flex field names to ConnectorRawListing
    return {
      mlsNumber: '',
      address: '',
      city: this.config.market,
      bedrooms: 0,
      bathrooms: 0,
      listPrice: 0,
      propertyType: 'SFR',
      status: '',
    };
  }
}
