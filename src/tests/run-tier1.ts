import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { SparkConnector } from '../connectors/spark-connector';
import { PipelineOrchestratorService } from '../services/pipeline-orchestrator';
import { CompLoaderService } from '../services/comp-loader';

const prisma = new PrismaClient();

async function runTier1() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  FULL PIPELINE - Comp Load + Tier 1 Analysis');
  console.log('═══════════════════════════════════════════════════\n');

  const startTime = Date.now();
  const compLoader = new CompLoaderService(prisma);

  // STEP 1: Load sold comps (last 180 days)
  console.log('STEP 1: Loading sold comps from Spark API...\n');

  await compLoader.loadCompsFromSpark({
    accessToken: process.env.SPARK_IRON_ACCESS_TOKEN!,
    market: 'Cedar City',
    marketSource: 'Spark-Iron',
    daysBack: 180,
  });

  await compLoader.loadCompsFromSpark({
    accessToken: process.env.SPARK_WASHINGTON_ACCESS_TOKEN!,
    market: 'St. George',
    marketSource: 'Spark-Washington',
    daysBack: 180,
  });

  // STEP 2: Build ZIP benchmarks from comps
  console.log('\nSTEP 2: Building ZIP benchmarks...\n');
  await compLoader.buildZipBenchmarks('Cedar City');
  await compLoader.buildZipBenchmarks('St. George');

  const compCount = await prisma.comp.count();
  const zipCount = await prisma.zipBenchmark.count();
  console.log(`\n  Total comps: ${compCount} | ZIP benchmarks: ${zipCount}\n`);

  // STEP 3: Score active listings
  console.log('STEP 3: Scoring active listings...\n');

  // Reset existing scores for clean re-run
  await prisma.listing.deleteMany({});
  await prisma.propertyScoreHistory.deleteMany({});

  const cedarConnector = new SparkConnector({
    market: 'Cedar City',
    baseURL: 'https://replication.sparkapi.com/Version/3/Reso/OData',
    accessToken: process.env.SPARK_IRON_ACCESS_TOKEN,
  });

  const sgConnector = new SparkConnector({
    market: 'St. George',
    baseURL: 'https://replication.sparkapi.com/Version/3/Reso/OData',
    accessToken: process.env.SPARK_WASHINGTON_ACCESS_TOKEN,
  });

  const cedarPipeline = new PipelineOrchestratorService({
    prisma,
    connectors: [cedarConnector],
    market: 'Cedar City',
  });
  const cedarStats = await cedarPipeline.runTier1NewListings();

  const sgPipeline = new PipelineOrchestratorService({
    prisma,
    connectors: [sgConnector],
    market: 'St. George',
  });
  const sgStats = await sgPipeline.runTier1NewListings();

  // RESULTS
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════\n');

  const highVelocity = await prisma.listing.findMany({
    where: { flipVelocityLevel: 'High Velocity', isActive: true },
    orderBy: { flipVelocityScore: 'desc' },
    take: 25,
  });

  const evaluate = await prisma.listing.findMany({
    where: { flipVelocityLevel: 'Evaluate', isActive: true },
    orderBy: { flipVelocityScore: 'desc' },
    take: 15,
  });

  console.log(`HIGH VELOCITY (70+): ${highVelocity.length} properties\n`);
  for (const l of highVelocity) {
    console.log(`  SCORE ${l.flipVelocityScore} | ${l.address}, ${l.city} ${l.zipCode} | $${l.listPrice.toLocaleString()}`);
    console.log(`    ${l.bedrooms}bd/${l.bathrooms}ba | ${l.sqft || '?'} sqft | DOM ${l.dom} | Year ${l.yearBuilt || '?'}`);
    console.log(`    Opp: ${l.opportunityScore} | ZIP: ${l.zipAbsorptionScore} | Reno: ${l.renoScopeScore} (${l.renoRiskLevel}) | Buyer: ${l.buyerPoolScore}`);
    if (l.modelARV) console.log(`    ARV: $${l.modelARV.toLocaleString()} (${l.modelARVConfidenceDetail})`);
    if (l.remarks) console.log(`    "${l.remarks.substring(0, 150)}..."`);
    console.log();
  }

  console.log(`EVALUATE (40-69): Top ${Math.min(evaluate.length, 15)} of ${evaluate.length}\n`);
  for (const l of evaluate.slice(0, 15)) {
    console.log(`  SCORE ${l.flipVelocityScore} | ${l.address}, ${l.city} ${l.zipCode} | $${l.listPrice.toLocaleString()}`);
    console.log(`    ${l.bedrooms}bd/${l.bathrooms}ba | ${l.sqft || '?'} sqft | DOM ${l.dom} | Opp: ${l.opportunityScore} | ZIP: ${l.zipAbsorptionScore} | Reno: ${l.renoScopeScore} | Buyer: ${l.buyerPoolScore} | ARV: $${l.modelARV?.toLocaleString() || '0'}`);
  }

  // Summary
  const totalScored = await prisma.listing.count({ where: { isActive: true } });
  const byLevel = await prisma.listing.groupBy({
    by: ['flipVelocityLevel'],
    _count: true,
    where: { isActive: true },
  });
  const byMarket = await prisma.listing.groupBy({
    by: ['market'],
    _count: true,
    where: { isActive: true },
  });

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`  Total scored: ${totalScored}`);
  for (const m of byMarket) console.log(`    ${m.market}: ${m._count}`);
  console.log();
  for (const l of byLevel) console.log(`    ${l.flipVelocityLevel}: ${l._count}`);
  console.log(`  Sold comps loaded: ${compCount}`);
  console.log(`  ZIP benchmarks: ${zipCount}`);
  console.log(`  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  await prisma.$disconnect();
}

runTier1().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
