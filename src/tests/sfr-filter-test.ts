import dotenv from 'dotenv';
dotenv.config();
import { SparkConnector } from '../connectors/spark-connector';

async function test() {
  console.log('=== SFR-Only Filter Test ===\n');

  const cedar = new SparkConnector({
    market: 'Cedar City',
    baseURL: 'https://replication.sparkapi.com/Version/3/Reso/OData',
    accessToken: process.env.SPARK_IRON_ACCESS_TOKEN,
  });
  const cedarListings = await cedar.fetchNewListings();
  const cedarTypes = cedarListings.reduce((acc: Record<string, number>, l) => {
    acc[l.propertyType] = (acc[l.propertyType] || 0) + 1;
    return acc;
  }, {});
  console.log(`  Cedar City: ${cedarListings.length} listings`);
  console.log(`  Types:`, cedarTypes);

  console.log();

  const sg = new SparkConnector({
    market: 'St. George',
    baseURL: 'https://replication.sparkapi.com/Version/3/Reso/OData',
    accessToken: process.env.SPARK_WASHINGTON_ACCESS_TOKEN,
  });
  const sgListings = await sg.fetchNewListings();
  const sgTypes = sgListings.reduce((acc: Record<string, number>, l) => {
    acc[l.propertyType] = (acc[l.propertyType] || 0) + 1;
    return acc;
  }, {});
  console.log(`  St. George: ${sgListings.length} listings`);
  console.log(`  Types:`, sgTypes);
}

test().catch(console.error);
