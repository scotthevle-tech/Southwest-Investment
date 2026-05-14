/**
 * Base MLS Connector
 * Abstract class for all MLS data sources
 * Handles authentication, error handling, pagination framework
 */

import { ConnectorRawListing } from '../types';

export interface ConnectorConfig {
  baseURL: string;
  apiKey: string;
  savedSearchId: string;
  market: 'Las Vegas' | 'St. George' | 'Cedar City';
}

export interface ConnectorStatus {
  connectorName: string;
  isHealthy: boolean;
  lastCheckAt: Date;
  lastError?: string;
}

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected lastStatus: ConnectorStatus;

  constructor(config: ConnectorConfig) {
    this.config = config;
    this.lastStatus = {
      connectorName: this.constructor.name,
      isHealthy: true,
      lastCheckAt: new Date(),
    };
  }

  /**
   * Fetch new listings from MLS
   * Should be implemented by subclasses
   */
  abstract fetchNewListings(): Promise<ConnectorRawListing[]>;

  /**
   * Fetch price + status delta for all active listings (fast check)
   * Should be implemented by subclasses
   */
  abstract fetchDeltaCheck(): Promise<
    Array<{
      mlsNumber: string;
      listPrice: number;
      status: string;
      dom: number;
    }>
  >;

  /**
   * Get connector health status
   */
  getStatus(): ConnectorStatus {
    return this.lastStatus;
  }

  /**
   * Update status
   */
  protected updateStatus(isHealthy: boolean, error?: string): void {
    this.lastStatus = {
      connectorName: this.constructor.name,
      isHealthy,
      lastCheckAt: new Date(),
      lastError: error,
    };
  }

  /**
   * Validate config
   */
  protected validateConfig(): boolean {
    return !!(this.config.baseURL && this.config.apiKey && this.config.savedSearchId);
  }
}
