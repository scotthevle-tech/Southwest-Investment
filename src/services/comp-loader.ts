import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { RENOVATION_KEYWORDS, HARD_FILTERS } from '../config/markets';

const SPARK_BASE_URL = 'https://replication.sparkapi.com/Version/3/Reso/OData';
const PAGE_SIZE = 200;
const MAX_PAGES = 50;

const COMP_FIELDS = [
  'ListingKey', 'ListingId', 'ListPrice', 'ClosePrice',
  'StandardStatus', 'DaysOnMarket', 'CloseDate',
  'StreetNumber', 'StreetDirPrefix', 'StreetName', 'StreetSuffix',
  'City', 'PostalCode', 'CountyOrParish',
  'BedroomsTotal', 'BathroomsTotalInteger', 'BathroomsTotalDecimal',
  'BuildingAreaTotal', 'AboveGradeFinishedArea', 'YearBuilt',
  'GarageSpaces', 'LotSizeSquareFeet',
  'PropertyType', 'PropertySubType',
  'PublicRemarks',
].join(',');

interface SparkCompConfig {
  accessToken: string;
  market: string;
  marketSource: string;
  daysBack?: number;
}

export class CompLoaderService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async loadCompsFromSpark(config: SparkCompConfig): Promise<number> {
    const daysBack = config.daysBack || 180;
    const sinceDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const sinceDateStr = sinceDate.toISOString().split('T')[0];

    console.log(`[CompLoader-${config.market}] Fetching sold comps since ${sinceDateStr}...`);

    const client = axios.create({
      baseURL: SPARK_BASE_URL,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Accept': 'application/json',
      },
      timeout: 60000,
    });

    const filter = [
      "PropertyType eq 'Residential'",
      "StandardStatus eq 'Closed'",
      `CloseDate ge ${sinceDateStr}`,
    ].join(' and ');

    const allComps: any[] = [];
    let skip = 0;
    let page = 0;
    let hasMore = true;

    while (hasMore && page < MAX_PAGES) {
      const response = await client.get('/Property', {
        params: {
          '$filter': filter,
          '$select': COMP_FIELDS,
          '$top': PAGE_SIZE,
          '$skip': skip,
          '$orderby': 'CloseDate desc',
        },
      });

      const records = response.data?.value || [];
      if (records.length === 0) break;

      allComps.push(...records);
      skip += PAGE_SIZE;
      page++;
      if (records.length < PAGE_SIZE) hasMore = false;
    }

    console.log(`[CompLoader-${config.market}] Fetched ${allComps.length} sold comps (${page} pages)`);

    let loaded = 0;
    for (const raw of allComps) {
      try {
        const mlsNumber = raw.ListingKey || raw.ListingId;
        if (!mlsNumber || !raw.ClosePrice) continue;

        const sqft = Number(raw.BuildingAreaTotal) || Number(raw.AboveGradeFinishedArea) || 0;
        if (sqft < 400) continue;

        const streetParts = [raw.StreetNumber, raw.StreetDirPrefix, raw.StreetName, raw.StreetSuffix]
          .filter(Boolean).join(' ');

        const subType = String(raw.PropertySubType || '').toLowerCase();
        const isMobile = subType.includes('manufact') || subType.includes('mobile') || subType.includes('modular');
        if (isMobile) continue;
        const isSFR = subType.includes('single') || subType.includes('detach') || subType === '';
        if (!isSFR) continue;

        const remarksCheck = String(raw.PublicRemarks || '').toLowerCase();
        const isMobileRemarks = HARD_FILTERS.MOBILE_MANUFACTURED_REJECT.some(kw => remarksCheck.includes(kw));
        if (isMobileRemarks) continue;

        const remarks = String(raw.PublicRemarks || '').toLowerCase();
        const matchedKeywords = RENOVATION_KEYWORDS.filter(kw => remarks.includes(kw));
        const isRenovated = matchedKeywords.length >= 2;

        const closeDate = new Date(raw.CloseDate);
        const recencyDays = Math.floor((Date.now() - closeDate.getTime()) / (24 * 60 * 60 * 1000));

        const garageSpaces = Number(raw.GarageSpaces) || null;
        const lotSqft = Number(raw.LotSizeSquareFeet) || null;

        await this.prisma.comp.upsert({
          where: { id: `${config.marketSource}-${mlsNumber}` },
          update: {
            soldPrice: Number(raw.ClosePrice),
            listPrice: Number(raw.ListPrice) || 0,
            sqft,
            garageSpaces,
            lotSqft,
            domAtSale: Number(raw.DaysOnMarket) || 0,
            soldDate: closeDate,
            remarks: raw.PublicRemarks ? String(raw.PublicRemarks).substring(0, 2000) : null,
            renovatedKeywords: matchedKeywords.length > 0 ? matchedKeywords.join(',') : null,
            isRenovated,
            recencyDays,
          },
          create: {
            id: `${config.marketSource}-${mlsNumber}`,
            marketSource: config.marketSource,
            mlsNumber: String(mlsNumber),
            address: streetParts || 'Unknown',
            city: String(raw.City || config.market),
            zipCode: raw.PostalCode ? String(raw.PostalCode).substring(0, 5) : '00000',
            county: String(raw.CountyOrParish || ''),
            listPrice: Number(raw.ListPrice) || 0,
            soldPrice: Number(raw.ClosePrice),
            sqft,
            yearBuilt: Number(raw.YearBuilt) || null,
            bedrooms: Number(raw.BedroomsTotal) || 0,
            bathrooms: Number(raw.BathroomsTotalInteger) || Number(raw.BathroomsTotalDecimal) || 0,
            garageSpaces,
            lotSqft,
            dom: Number(raw.DaysOnMarket) || null,
            domAtSale: Number(raw.DaysOnMarket) || 0,
            soldDate: closeDate,
            remarks: raw.PublicRemarks ? String(raw.PublicRemarks).substring(0, 2000) : null,
            renovatedKeywords: matchedKeywords.length > 0 ? matchedKeywords.join(',') : null,
            isRenovated,
            recencyDays,
          },
        });

        loaded++;
      } catch (error) {
        // Skip duplicates or bad data
      }
    }

    console.log(`[CompLoader-${config.market}] Loaded ${loaded} SFR comps to database`);
    return loaded;
  }

  async buildZipBenchmarks(market: string): Promise<number> {
    console.log(`[ZipBenchmark-${market}] Building ZIP benchmarks from comp data...`);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const zipGroups = await this.prisma.comp.groupBy({
      by: ['zipCode'],
      where: {
        soldDate: { gte: ninetyDaysAgo },
      },
      _count: true,
      _avg: {
        domAtSale: true,
        soldPrice: true,
        sqft: true,
      },
    });

    let created = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const zip of zipGroups) {
      if (!zip.zipCode) continue;

      const compsInZip = await this.prisma.comp.findMany({
        where: {
          zipCode: zip.zipCode,
          soldDate: { gte: ninetyDaysAgo },
        },
        select: { domAtSale: true, soldPrice: true, sqft: true },
      });

      const domValues = compsInZip.map(c => c.domAtSale).sort((a, b) => a - b);
      const medianDOM = domValues.length > 0 ? domValues[Math.floor(domValues.length / 2)] : 0;

      const avgPSF = compsInZip.length > 0
        ? compsInZip.reduce((sum, c) => sum + (c.sqft > 0 ? c.soldPrice / c.sqft : 0), 0) / compsInZip.length
        : 0;

      const salesVelocity = zip._count / 3;

      let confidence = 'LOW';
      if (zip._count >= 10) confidence = 'HIGH';
      else if (zip._count >= 5) confidence = 'MEDIUM';

      const firstComp = await this.prisma.comp.findFirst({
        where: { zipCode: zip.zipCode },
        select: { city: true, county: true },
      });

      try {
        await this.prisma.zipBenchmark.upsert({
          where: {
            zipCode_recordDate: { zipCode: zip.zipCode, recordDate: today },
          },
          update: {
            soldSFRCount90d: zip._count,
            medianDOMSold90d: medianDOM,
            avgPSFSold90d: Math.round(avgPSF * 100) / 100,
            salesVelocityPerMo: Math.round(salesVelocity * 100) / 100,
            dataConfidence: confidence,
          },
          create: {
            zipCode: zip.zipCode,
            city: firstComp?.city || market,
            county: firstComp?.county || '',
            market,
            recordDate: today,
            soldSFRCount90d: zip._count,
            medianDOMSold90d: medianDOM,
            avgPSFSold90d: Math.round(avgPSF * 100) / 100,
            salesVelocityPerMo: Math.round(salesVelocity * 100) / 100,
            dataConfidence: confidence,
          },
        });
        created++;
      } catch (error) {
        // Skip errors
      }
    }

    console.log(`[ZipBenchmark-${market}] Created benchmarks for ${created} ZIP codes`);
    return created;
  }
}
