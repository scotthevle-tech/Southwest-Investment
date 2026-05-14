/**
 * Core type definitions for Southwest Investment Software
 */

export interface Listing {
  id: string;
  mlsNumber: string;
  market: 'Las Vegas' | 'St. George' | 'Cedar City';
  address: string;
  city: string;
  zipCode?: string;
  county?: string;
  listPrice: number;
  originalListPrice?: number;
  sqft?: number;
  bedrooms: number;
  bathrooms: number;
  garageSpaces?: number;
  lotSqft?: number;
  yearBuilt?: number;
  propertyType: string;
  status: string;
  isActive: boolean;
  dom?: number;
  remarks?: string;
  hoaMonthly?: number;
  waterSource?: string;
  sewerType?: string;

  // Price reduction tracking
  priceReductionCount?: number;
  priceReductionHistory?: unknown;
  totalDropPct?: number;

  // Scoring
  opportunityScore?: number;
  zipAbsorptionScore?: number;
  renoScopeScore?: number;
  renoRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  buyerPoolScore?: number;
  modelARV?: number;
  flipVelocityScore?: number;
  flipVelocityLevel?: 'High Velocity' | 'Evaluate' | 'Track Only';

  // Deal analysis
  estimatedRehab?: number;
  maxOffer?: number;
  potentialProfit?: number;
  spreadToARVPct?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface Comp {
  id: string;
  mlsNumber: string;
  address: string;
  city: string;
  zipCode: string;
  listPrice: number;
  soldPrice: number;
  sqft: number;
  yearBuilt?: number;
  bedrooms: number;
  bathrooms: number;
  domAtSale: number;
  soldDate: Date;
  remarks?: string;
  isRenovated: boolean;
  renovatedKeywords?: string[];
}

export interface ZipBenchmark {
  zipCode: string;
  city: string;
  market: string;
  activeSFRCount?: number;
  avgPSFActive?: number;
  avgDOMActive?: number;
  priceReductionRate?: number;
  soldSFRCount90d?: number;
  medianDOMSold90d?: number;
  avgPSFSold90d?: number;
  salesVelocityPerMo?: number;
  dataConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface OpportunityScorerResult {
  opportunityScore: number;
  breakdown: {
    pricePSFScore: number;
    domScore: number;
    priceReductionScore: number;
    motivatedSellerScore: number;
    propertyAgeScore: number;
    marketFlagsScore: number;
  };
  motivatedKeywords: string[];
}

export interface RenoScopeResult {
  renoScopeScore: number;
  renoRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  renoRiskFlags: string[];
}

export interface ZipAbsorptionResult {
  zipAbsorptionScore: number;
  zipMedianDOM: number;
  zipSalesVelocity: number;
  zipSalesCount90d: number;
  zipDataConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BuyerPoolResult {
  buyerPoolScore: number;
  buyerPoolLabel: string;
}

export interface ARVEstimationResult {
  modelARV: number;
  confidenceLevel: 'HIGH-RENOVATED' | 'MEDIUM-BLENDED' | 'MEDIUM-GENERAL' | 'LOW';
  compsUsedCount: number;
  renovatedCompsCount: number;
  avgPSFUsed: number;
  details: string;
}

export interface FlipVelocityResult {
  flipVelocityScore: number;
  flipVelocityLevel: 'High Velocity' | 'Evaluate' | 'Track Only';
  breakdown: {
    opportunityScore: number;
    zipAbsorptionScore: number;
    spreadScore: number;
    renoScopeScore: number;
    buyerPoolScore: number;
  };
  weights: {
    opportunity: number;
    zipAbsorption: number;
    spread: number;
    renoScope: number;
    buyerPool: number;
  };
}

export interface ConnectorRawListing {
  mlsNumber: string;
  address: string;
  city: string;
  zipCode?: string;
  county?: string;
  listPrice: number;
  originalListPrice?: number;
  sqft?: number;
  bedrooms: number;
  bathrooms: number;
  garageSpaces?: number;
  lotSqft?: number;
  yearBuilt?: number;
  status: string;
  dom?: number;
  remarks?: string;
  hoaMonthly?: number;
  waterSource?: string;
  sewerType?: string;
  propertyType: string;
  [key: string]: unknown;
}

export interface RunLogEntry {
  runType: 'TIER_1_NEW' | 'TIER_2_DELTA' | 'TIER_3_WATCHLIST' | 'WEEKLY_REFRESH';
  market?: string;
  newListingsCount: number;
  updatedListingsCount: number;
  errorCount: number;
  warnings?: Record<string, unknown>;
  connectorStatus?: Record<string, unknown>;
  durationMs: number;
}

export interface MorningReport {
  date: string;
  summary: {
    newListingsPerMarket: Record<string, number>;
    rescoreCount: number;
    priceAlertCount: number;
  };
  highVelocityCandidates: Listing[];
  watchlistUpdates: Listing[];
  evaluateCandidates: Listing[];
  priceDropAlerts: Array<{
    listing: Listing;
    previousPrice: number;
    newPrice: number;
    dropPct: number;
  }>;
  domMilestones: Listing[];
  backToActive: Listing[];
  connectorStatus: Record<string, string>;
}
