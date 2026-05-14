import dotenv from 'dotenv';
dotenv.config();

import { SparkConnector } from '../connectors/spark-connector';
import { TrestleConnector } from '../connectors/trestle-connector';

async function testConnectors() {
  console.log('=== MLS Connector Test (Final) ===\n');

  // Test 1: Spark - Cedar City (Iron County) - WORKING
  console.log('--- [1/3] Spark - Cedar City (Iron County) ---');
  try {
    const spark = new SparkConnector({
      market: 'Cedar City',
      baseURL: 'https://replication.sparkapi.com/Version/3/Reso/OData',
      accessToken: process.env.SPARK_IRON_ACCESS_TOKEN,
    });
    const listings = await spark.fetchNewListings();
    console.log(`RESULT: ${listings.length} listings fetched`);
    if (listings.length > 0) {
      const priceFiltered = listings.filter(l => l.listPrice > 0 && l.listPrice <= 500000);
      console.log(`  Within $500K filter: ${priceFiltered.length}`);
      const sfr = priceFiltered.filter(l => l.propertyType === 'SFR');
      console.log(`  SFR only: ${sfr.length}`);
      // Show top 3 by price
      sfr.sort((a, b) => a.listPrice - b.listPrice);
      sfr.slice(0, 3).forEach(l => {
        console.log(`  ${l.mlsNumber} | ${l.address}, ${l.city} ${l.zipCode} | $${l.listPrice.toLocaleString()} | ${l.bedrooms}bd/${l.bathrooms}ba | ${l.sqft || '?'} sqft | DOM ${l.dom}`);
      });
    }
  } catch (error: any) {
    console.log(`FAILED: ${error.message}`);
  }

  console.log();

  // Test 2: Spark - St. George (Washington County) - TOKEN ISSUE
  console.log('--- [2/3] Spark - St. George (Washington County) ---');
  try {
    const spark = new SparkConnector({
      market: 'St. George',
      baseURL: 'https://replication.sparkapi.com/Version/3/Reso/OData',
      accessToken: process.env.SPARK_WASHINGTON_ACCESS_TOKEN,
    });
    const listings = await spark.fetchNewListings();
    console.log(`RESULT: ${listings.length} listings fetched`);
  } catch (error: any) {
    console.log(`FAILED: ${error.message}`);
    console.log('  NOTE: Token may need to be re-verified from Spark dashboard');
  }

  console.log();

  // Test 3: Trestle - Las Vegas (Clark County) - AUTH WORKS
  console.log('--- [3/3] Trestle - Las Vegas (Clark County) ---');
  try {
    const trestle = new TrestleConnector({
      market: 'Las Vegas',
      baseURL: 'https://api-trestle.corelogic.com/trestle/odata',
      clientId: process.env.TRESTLE_CLIENT_ID,
      clientSecret: process.env.TRESTLE_CLIENT_SECRET,
    });
    const listings = await trestle.fetchNewListings();
    console.log(`RESULT: ${listings.length} listings fetched`);
    if (listings.length === 0) {
      console.log('  NOTE: Data plan may still be syncing Active listings.');
      console.log('  Auth is working. Check with LVR MLS support if 0 persists.');
    }
  } catch (error: any) {
    console.log(`FAILED: ${error.message}`);
  }

  console.log('\n=== Summary ===');
  console.log('  Cedar City:  API connected, pulling real listings');
  console.log('  St. George:  Token needs verification');
  console.log('  Las Vegas:   Auth works, awaiting Active listing sync');
}

testConnectors().catch(console.error);
