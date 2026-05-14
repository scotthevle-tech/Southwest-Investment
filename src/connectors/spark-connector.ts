import axios, { AxiosInstance } from 'axios';
import { BaseConnector, ConnectorConfig } from './base-connector';
import { ConnectorRawListing } from '../types';

const SPARK_BASE_URL = 'https://replication.sparkapi.com/Version/3/Reso/OData';
const PAGE_SIZE = 200;
const MAX_PAGES = 25;

const LISTING_FIELDS = [
  'ListingKey', 'ListingId', 'ListPrice', 'OriginalListPrice',
  'StandardStatus', 'MlsStatus', 'DaysOnMarket',
  'StreetNumber', 'StreetDirPrefix', 'StreetName', 'StreetSuffix',
  'City', 'PostalCode', 'CountyOrParish', 'StateOrProvince',
  'BedroomsTotal', 'BathroomsTotalInteger', 'BathroomsTotalDecimal',
  'BuildingAreaTotal', 'AboveGradeFinishedArea', 'YearBuilt',
  'GarageSpaces', 'LotSizeSquareFeet',
  'PropertyType', 'PropertySubType',
  'PublicRemarks',
  'AssociationFee', 'AssociationFeeFrequency',
  'WaterSource',
  'ListingContractDate', 'OnMarketDate',
].join(',');

const DELTA_FIELDS = [
  'ListingKey', 'ListingId', 'ListPrice', 'StandardStatus', 'MlsStatus', 'DaysOnMarket',
].join(',');

export class SparkConnector extends BaseConnector {
  private client: AxiosInstance;

  constructor(config: ConnectorConfig) {
    super(config);
    if (!config.accessToken) {
      throw new Error(`${config.market} SparkConnector: accessToken is required`);
    }
    this.client = axios.create({
      baseURL: SPARK_BASE_URL,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Accept': 'application/json',
      },
      timeout: 60000,
    });
  }

  async fetchNewListings(): Promise<ConnectorRawListing[]> {
    try {
      console.log(`[Spark-${this.config.market}] Fetching active SFR listings...`);

      const filter = [
        "PropertyType eq 'Residential'",
        "(StandardStatus eq 'Active' or StandardStatus eq 'Active Under Contract')",
        "(PropertySubType eq 'Single Family Residence' or PropertySubType eq 'SingleFamilyResidence' or PropertySubType eq 'Detached')",
        "SeniorCommunityYN ne true",
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

      console.log(`[Spark-${this.config.market}] Fetched ${allListings.length} listings (${page} pages)`);
      this.updateStatus(true, undefined, allListings.length);
      return allListings;
    } catch (error) {
      const msg = this.extractErrorMessage(error);
      console.error(`[Spark-${this.config.market}] Error fetching listings: ${msg}`);
      this.updateStatus(false, msg);
      throw error;
    }
  }

  async fetchDeltaCheck(): Promise<
    Array<{ mlsNumber: string; listPrice: number; status: string; dom: number }>
  > {
    try {
      console.log(`[Spark-${this.config.market}] Running delta check...`);

      const filter = [
        "PropertyType eq 'Residential'",
        "(StandardStatus eq 'Active' or StandardStatus eq 'Active Under Contract' or StandardStatus eq 'Pending')",
        "(PropertySubType eq 'Single Family Residence' or PropertySubType eq 'SingleFamilyResidence' or PropertySubType eq 'Detached')",
        "SeniorCommunityYN ne true",
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

      console.log(`[Spark-${this.config.market}] Delta check: ${results.length} active listings`);
      this.updateStatus(true);
      return results;
    } catch (error) {
      const msg = this.extractErrorMessage(error);
      console.error(`[Spark-${this.config.market}] Delta check error: ${msg}`);
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
    const city = String(raw.City || this.config.market);

    let bathrooms = Number(raw.BathroomsTotalInteger) || Number(raw.BathroomsTotalDecimal) || 0;

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
    const isMobile = subType.includes('manufact') || subType.includes('mobile') || subType.includes('modular');
    if (isMobile) return null;
    const isSFR = subType.includes('single') || subType.includes('detach') || subType === '';

    return {
      mlsNumber: String(mlsNumber),
      address,
      city,
      zipCode: raw.PostalCode ? String(raw.PostalCode).substring(0, 5) : undefined,
      county: raw.CountyOrParish ? String(raw.CountyOrParish) : undefined,
      listPrice: Number(raw.ListPrice) || 0,
      originalListPrice: Number(raw.OriginalListPrice) || undefined,
      sqft: Number(raw.BuildingAreaTotal) || Number(raw.AboveGradeFinishedArea) || undefined,
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
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 401) return 'Authentication failed - check access token';
      if (status === 403) return 'Access denied - check API permissions';
      if (status === 429) return 'Rate limited - too many requests';
      return `HTTP ${status}: ${JSON.stringify(data) || error.message}`;
    }
    return error instanceof Error ? error.message : String(error);
  }
}
