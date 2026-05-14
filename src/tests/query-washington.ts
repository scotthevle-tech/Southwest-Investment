import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  // Check what county/city values exist
  const counties = await prisma.listing.groupBy({ by: ['county'], _count: true, where: { isActive: true } });
  console.log('Counties in DB:');
  for (const c of counties) { console.log(`  "${c.county}": ${c._count}`); }

  const markets = await prisma.listing.groupBy({ by: ['market'], _count: true, where: { isActive: true } });
  console.log('\nMarkets in DB:');
  for (const m of markets) { console.log(`  "${m.market}": ${m._count}`); }

  const listings = await prisma.listing.findMany({
    where: {
      isActive: true,
      spreadToARVPct: { gt: 0 },
      market: 'St. George',
    },
    orderBy: { flipVelocityScore: 'desc' },
    take: 25,
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TOP PROPERTIES - ST. GEORGE MLS (Washington County)');
  console.log(`  ${listings.length} properties with positive spread`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const l of listings) {
    const profit = l.potentialProfit || 0;
    const sign = profit >= 0 ? '+' : '';
    console.log(`  SCORE ${l.flipVelocityScore} | MLS# ${l.mlsNumber}`);
    console.log(`    ${l.address}, ${l.city} ${l.zipCode}`);
    console.log(`    ${l.bedrooms}bd/${l.bathrooms}ba | ${l.sqft || '?'} sqft | DOM ${l.dom} | Year ${l.yearBuilt || '?'}`);
    console.log(`    List: $${l.listPrice.toLocaleString()} | ARV: $${(l.modelARV || 0).toLocaleString()} | Spread: ${l.spreadToARVPct || 0}%`);
    console.log(`    Max Offer: $${(l.maxOffer || 0).toLocaleString()} | Rehab: $${(l.estimatedRehab || 0).toLocaleString()} | Profit: ${sign}$${profit.toLocaleString()}`);
    console.log(`    Opp: ${l.opportunityScore} | ZIP: ${l.zipAbsorptionScore} | Reno: ${l.renoScopeScore} (${l.renoRiskLevel}) | Buyer: ${l.buyerPoolScore}`);
    console.log(`    ARV Confidence: ${l.modelARVConfidenceDetail || 'N/A'}`);
    if (l.remarks) console.log(`    "${l.remarks.substring(0, 180)}..."`);
    console.log();
  }

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
