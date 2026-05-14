import axios, { AxiosInstance } from 'axios';
import { BaseConnector, ConnectorConfig } from './base-connector';
import { ConnectorRawListing } from '../types';

const TRESTLE_TOKEN_URL = 'https://api-trestle.corelogic.com/trestle/oidc/connect/token';
const TRESTLE_API_URL = 'https://api-trestle.corelogic.com/trestle/odata';
const PAGE_SIZE = 200;
const MAX_PAGES = 50;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

const LISTING_FIELDS = [
  'ListingKey', 'ListingId', 'ListPrice', 'OriginalListPrice',
  'StandardStatus', 'MlsStatus', 'DaysOnMarket',
  'StreetNumber', 'StreetDirPrefix', 'StreetName', 'StreetSuffix',
  'City', 'PostalCode', 'CountyOrParish', 'StateOrProvince',
  'BedroomsTotal', 'BathroomsTotalInteger', 'BathroomsFull', 'BathroomsHalf',
  'LivingArea', 'YearBuilt', 'GarageSpaces', 'LotSizeSquareFeet',
  'PropertyType', 'PropertySubType',
  'PublicRemarks',
  'AssociationFee', 'AssociationFeeFrequency',
  'WaterSource', 'Sewer',
  'ListingContractDate', 'OnMarketDate',
].join(',');

const DELTA_FIELDS = [
  'ListingKey', 'ListingId', 'ListPrice', 'StandardStatus', 'MlsStatus', 'DaysOnMarket',
].join(',');

export class TrestleConnector extends BaseConnector {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: ConnectorConfig) {
    super(config);
    if (!config.clientId) {
      throw new Error('TrestleConnector: clientId is required');
    }
    this.client = axios.create({
      baseURL: TRESTLE_API_URL,
      headers: { 'Accept': 'application/json' },
      timeout: 60000,
    });
  }

  private async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return;
    }

    if (!this.config.clientSecret) {
      throw new Error(
        'TrestleConnector: clientSecret (API password) is required. ' +
        'Go to https://trestle.corelogic.com/BKR/Tools/FeedOrganizer and click "RESET API PASSWORD" to get it.'
      );
    }

    console.log('[Trestle-LV] Authenticating via OAuth2...');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.config.clientId!);
    params.append('client_secret', this.config.clientSecret);
    params.append('scope', 'api');

    const response = await axios.post(TRESTLE_TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    this.accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600;
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;

    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    console.log(`[Trestle-LV] Authenticated (expires in ${expiresIn}s)`);
  }

  async fetchNewListings(): Promise<ConnectorRawListing[]> {
    try {
      await this.authenticate();
      console.log('[Trestle-LV] Fetching active SFR listings...');

      const filter = [
        "PropertyType eq 'Residential'",
        "(StandardStatus eq 'Active' or StandardStatus eq 'ActiveUnderContract')",
        "(PropertySubType eq 'SingleFamilyResidence' or PropertySubType eq 'Single Family Residence' or PropertySubType eq 'Detached')",
        "SeniorCommunityYN ne true",
        "CountyOrParish eq 'Clark'",
      ].join(' and ');

      const allListings: ConnectorRawListing[] = [];
      let skip = 0;
      let page = 0;
      let hasMore = true;

      while (hasMore && page < MAX_PAGES) {
        const response = await this.client.get('/Property', {
          params: {
            '$filter': filter,
            '$select': LISTING_FIELDS,
            '$top': PAGE_SIZE,
            '$skip': skip,
            '$orderby': 'ListingContractDate desc',
          },
        });

        const records = response.data?.value || [];
        if (records.length === 0) {
          hasMore = false;
          break;
        }

        for (const raw of records) {
          const normalized = this.normalizeToRaw(raw);
          if (normalized) {
            allListings.push(normalized);
          }
        }

        skip += PAGE_SIZE;
        page++;

        if (records.length < PAGE_SIZE) {
          hasMore = false;
        }
      }

      console.log(`[Trestle-LV] Fetched ${allListings.length} listings (${page} pages)`);
      this.updateStatus(true, undefined, allListings.length);
      return allListings;
    } catch (error) {
      const msg = this.extractErrorMessage(error);
      console.error(`[Trestle-LV] Error fetching listings: ${msg}`);
      this.updateStatus(false, msg);
      throw error;
    }
  }

  async fetchDeltaCheck(): Promise<
    Array<{ mlsNumber: string; listPrice: number; status: string; dom: number }>
  > {
    try {
      await this.authenticate();
      console.log('[Trestle-LV] Running delta check...');

      const filter = [
        "PropertyType eq 'Residential'",
        "(StandardStatus eq 'Active' or StandardStatus eq 'ActiveUnderContract' or StandardStatus eq 'Pending')",
        "(PropertySubType eq 'SingleFamilyResidence' or PropertySubType eq 'Single Family Residence' or PropertySubType eq 'Detached')",
        "SeniorCommunityYN ne true",
        "CountyOrParish eq 'Clark'",
      ].join(' and ');

      const results: Array<{ mlsNumber: string; listPrice: number; status: string; dom: number }> = [];
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get('/Property', {
          params: {
            '$filter': filter,
            '$select': DELTA_FIELDS,
            '$top': PAGE_SIZE,
            '$skip': skip,
          },
        });

        const records = response.data?.value || [];
        if (records.length === 0) break;

        for (const raw of records) {
          const mlsNumber = raw.ListingKey || raw.ListingId;
          if (!mlsNumber) continue;
          results.push({
            mlsNumber: String(mlsNumber),
            listPrice: Number(raw.ListPrice) || 0,
            status: raw.StandardStatus || raw.MlsStatus || 'Unknown',
            dom: Number(raw.DaysOnMarket) || 0,
          });
        }

        skip += PAGE_SIZE;
        if (records.length < PAGE_SIZE) hasMore = false;
      }

      console.log(`[Trestle-LV] Delta check: ${results.length} active listings`);
      this.updateStatus(true);
      return results;
    } catch (error) {
      const msg = this.extractErrorMessage(error);
      console.error(`[Trestle-LV] Delta check error: ${msg}`);
      this.updateStatus(false, msg);
      throw error;
    }
  }

  private normalizeToRaw(raw: Record<string, unknown>): ConnectorRawListing | null {
    const mlsNumber = raw.ListingKey || raw.ListingId;
    if (!mlsNumber) return null;

    const streetParts = [
      raw.StreetNumber,
      raw.StreetDirPrefix,
      raw.StreetName,
      raw.StreetSuffix,
    ].filter(Boolean).join(' ');

    const address = streetParts || 'Unknown Address';

    let bathrooms = Number(raw.BathroomsTotalInteger) || 0;
    if (!bathrooms) {
      const full = Number(raw.BathroomsFull) || 0;
      const half = Number(raw.BathroomsHalf) || 0;
      bathrooms = full + half * 0.5;
    }

    let hoaMonthly: number | undefined;
    const assocFee = Number(raw.AssociationFee);
    if (assocFee > 0) {
      const freq = String(raw.AssociationFeeFrequency || '').toLowerCase();
      if (freq.includes('annual') || freq.includes('yearly')) {
        hoaMonthly = assocFee / 12;
      } else if (freq.includes('quarter')) {
        hoaMonthly = assocFee / 3;
      } else {
        hoaMonthly = assocFee;
      }
    }

    const subType = String(raw.PropertySubType || '').toLowerCase();
    const isSFR = subType.includes('single') || subType.includes('detach') || subType === '';

    return {
      mlsNumber: String(mlsNumber),
      address,
      city: String(raw.City || 'Las Vegas'),
      zipCode: raw.PostalCode ? String(raw.PostalCode).substring(0, 5) : undefined,
      county: raw.CountyOrParish ? String(raw.CountyOrParish) : undefined,
      listPrice: Number(raw.ListPrice) || 0,
      originalListPrice: Number(raw.OriginalListPrice) || undefined,
      sqft: Number(raw.LivingArea) || undefined,
      bedrooms: Number(raw.BedroomsTotal) || 0,
      bathrooms,
      garageSpaces: Number(raw.GarageSpaces) || undefined,
      lotSqft: Number(raw.LotSizeSquareFeet) || undefined,
      yearBuilt: Number(raw.YearBuilt) || undefined,
      propertyType: isSFR ? 'SFR' : String(raw.PropertySubType || 'SFR'),
      status: String(raw.StandardStatus || raw.MlsStatus || 'Active'),
      dom: Number(raw.DaysOnMarket) || 0,
      remarks: raw.PublicRemarks ? String(raw.PublicRemarks) : undefined,
      hoaMonthly,
      waterSource: raw.WaterSource ? String(raw.WaterSource) : undefined,
      sewerType: raw.Sewer ? String(raw.Sewer) : undefined,
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 401) return 'Authentication failed - check client ID and secret';
      if (status === 403) return 'Access denied - check API permissions';
      if (status === 429) return 'Rate limited - too many requests';
      return `HTTP ${status}: ${JSON.stringify(data) || error.message}`;
    }
    return error instanceof Error ? error.message : String(error);
  }
}
