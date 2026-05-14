/**
 * Sample test data and fixtures for development/testing
 * Use these to validate scoring algorithms without real MLS APIs
 */

import { ConnectorRawListing } from '../types';

/**
 * Sample Las Vegas listings (for testing MLXchange)
 */
export const SAMPLE_LAS_VEGAS_LISTINGS: ConnectorRawListing[] = [
  {
    mlsNumber: 'LV-001-HIGH-VELOCITY',
    address: '1234 Peaceful St',
    city: 'Las Vegas',
    zipCode: '89102',
    county: 'Clark',
    listPrice: 380000,
    originalListPrice: 420000,
    sqft: 1850,
    bedrooms: 3,
    bathrooms: 2.5,
    yearBuilt: 1987,
    propertyType: 'SFR',
    status: 'Active',
    dom: 85,
    remarks:
      'Updated flooring and paint. Estate sale, motivated seller. Cosmetic updates, needs kitchen refresh. Great neighborhood.',
    hoaMonthly: 75,
    waterSource: 'Municipal',
    sewerType: 'Public',
  },
  {
    mlsNumber: 'LV-002-EVALUATE',
    address: '5678 Mountain View Dr',
    city: 'Las Vegas',
    zipCode: '89103',
    county: 'Clark',
    listPrice: 450000,
    sqft: 2100,
    bedrooms: 4,
    bathrooms: 2,
    yearBuilt: 2005,
    propertyType: 'SFR',
    status: 'Active',
    dom: 45,
    remarks: 'Turnkey property, move-in ready. Updated appliances and HVAC. Minor cosmetic needed.',
    hoaMonthly: 95,
    waterSource: 'Municipal',
    sewerType: 'Public',
  },
  {
    mlsNumber: 'LV-003-TRACK-ONLY',
    address: '9012 Desert Lane',
    city: 'Las Vegas',
    zipCode: '89104',
    county: 'Clark',
    listPrice: 520000,
    originalListPrice: 525000,
    sqft: 1600,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 1975,
    propertyType: 'SFR',
    status: 'Active',
    dom: 22,
    remarks: 'Pre-1978, original fixtures. Pool. As-is. Fixer upper opportunity.',
    hoaMonthly: 110, // Exceeds hard filter
    waterSource: 'Municipal',
    sewerType: 'Public',
  },
  {
    mlsNumber: 'LV-004-RENO-RISK',
    address: '3456 Foundation St',
    city: 'Las Vegas',
    zipCode: '89105',
    county: 'Clark',
    listPrice: 320000,
    sqft: 1400,
    bedrooms: 2,
    bathrooms: 1.5,
    yearBuilt: 1972,
    propertyType: 'SFR',
    status: 'Active',
    dom: 125,
    remarks: 'Probate sale. Foundation issues mentioned. Water damage in basement. Motivated seller.',
    hoaMonthly: 50,
    waterSource: 'Municipal',
    sewerType: 'Public',
  },
];

/**
 * Sample St. George listings (for testing Flex Washington)
 */
export const SAMPLE_ST_GEORGE_LISTINGS: ConnectorRawListing[] = [
  {
    mlsNumber: 'SG-001-PEAK-DEMAND',
    address: '2211 Red Rock Rd',
    city: 'St. George',
    zipCode: '84770',
    county: 'Washington',
    listPrice: 380000,
    originalListPrice: 395000,
    sqft: 1950,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 2000,
    propertyType: 'SFR',
    status: 'Active',
    dom: 65,
    remarks: 'Renovated kitchen and flooring. Updated HVAC. Paint and carpet fresh. Good price.',
    hoaMonthly: 60,
    waterSource: 'Municipal',
    sewerType: 'Public',
  },
  {
    mlsNumber: 'SG-002-POOL-RISK',
    address: '1122 Canyon View',
    city: 'St. George',
    zipCode: '84771',
    county: 'Washington',
    listPrice: 420000,
    sqft: 2200,
    bedrooms: 4,
    bathrooms: 3,
    yearBuilt: 1995,
    propertyType: 'SFR',
    status: 'Active',
    dom: 35,
    remarks: 'Pool, spa, updated landscape. Needs interior cosmetic refresh. Good bones.',
    hoaMonthly: 85,
    waterSource: 'Municipal',
    sewerType: 'Public',
  },
];

/**
 * Sample Cedar City listings (for testing Flex Iron)
 */
export const SAMPLE_CEDAR_CITY_LISTINGS: ConnectorRawListing[] = [
  {
    mlsNumber: 'CC-001-SMALL-TOWN',
    address: '555 Pioneer St',
    city: 'Cedar City',
    zipCode: '84720',
    county: 'Iron',
    listPrice: 280000,
    sqft: 1350,
    bedrooms: 2,
    bathrooms: 1,
    yearBuilt: 1985,
    propertyType: 'SFR',
    status: 'Active',
    dom: 40,
    remarks: 'Updated, cosmetic condition. Carpet and paint fresh. Good starter investment.',
    hoaMonthly: 0,
    waterSource: 'Municipal',
    sewerType: 'Public',
  },
];

/**
 * Sample sold comparables for ARV estimation
 */
export const SAMPLE_SOLD_COMPS_LV = [
  {
    mlsNumber: 'LV-COMP-001',
    soldPrice: 450000,
    sqft: 1900,
    domAtSale: 28,
    soldDate: new Date('2024-05-01'),
    remarks: 'Renovated, new kitchen, updated flooring',
  },
  {
    mlsNumber: 'LV-COMP-002',
    soldPrice: 440000,
    sqft: 1850,
    domAtSale: 32,
    soldDate: new Date('2024-05-08'),
    remarks: 'Turnkey, move-in ready, new appliances',
  },
  {
    mlsNumber: 'LV-COMP-003',
    soldPrice: 430000,
    sqft: 1800,
    domAtSale: 25,
    soldDate: new Date('2024-04-25'),
    remarks: 'Updated, fresh paint, new carpet',
  },
  {
    mlsNumber: 'LV-COMP-004',
    soldPrice: 385000,
    sqft: 1850,
    domAtSale: 45,
    soldDate: new Date('2024-04-10'),
    remarks: 'As-is, original condition, cosmetic only',
  },
  {
    mlsNumber: 'LV-COMP-005',
    soldPrice: 420000,
    sqft: 1950,
    domAtSale: 35,
    soldDate: new Date('2024-04-15'),
    remarks: 'Updated exterior, needs interior cosmetic',
  },
];

/**
 * Sample ZIP benchmark data (89102 - Las Vegas)
 */
export const SAMPLE_ZIP_BENCHMARK_89102 = {
  zipCode: '89102',
  city: 'Las Vegas',
  market: 'Las Vegas',
  activeSFRCount: 24,
  avgPSFActive: 228,
  avgDOMActive: 42,
  priceReductionRate: 0.35,
  soldSFRCount90d: 18,
  medianDOMSold90d: 32,
  avgPSFSold90d: 235,
  salesVelocityPerMo: 6,
  dataConfidence: 'HIGH',
};
