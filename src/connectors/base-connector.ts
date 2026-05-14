import { ConnectorRawListing } from '../types';

export interface ConnectorConfig {
  market: 'Las Vegas' | 'St. George' | 'Cedar City';
  baseURL: string;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  feedId?: string;
}

export interface ConnectorStatus {
  connectorName: string;
  market: string;
  isHealthy: boolean;
  lastCheckAt: Date;
  lastError?: string;
  listingsFetched?: number;
}

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected lastStatus: ConnectorStatus;

  constructor(config: ConnectorConfig) {
    this.config = config;
    this.lastStatus = {
      connectorName: this.constructor.name,
      market: config.market,
      isHealthy: true,
      lastCheckAt: new Date(),
    };
  }

  abstract fetchNewListings(): Promise<ConnectorRawListing[]>;

  abstract fetchDeltaCheck(): Promise<
    Array<{
      mlsNumber: string;
      listPrice: number;
      status: string;
      dom: number;
    }>
  >;

  getStatus(): ConnectorStatus {
    return this.lastStatus;
  }

  protected updateStatus(isHealthy: boolean, error?: string, listingsFetched?: number): void {
    this.lastStatus = {
      connectorName: this.constructor.name,
      market: this.config.market,
      isHealthy,
      lastCheckAt: new Date(),
      lastError: error,
      listingsFetched,
    };
  }
}
