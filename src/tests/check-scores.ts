import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkScores() {
  const top = await prisma.listing.findMany({
    where: { isActive: true },
    orderBy: { flipVelocityScore: 'desc' },
    take: 5,
    select: {
      address: true, city: true, zipCode: true, listPrice: true,
      flipVelocityScore: true, flipVelocityBreakdown: true,
      opportunityScore: true, zipAbsorptionScore: true, renoScopeScore: true,
      buyerPoolScore: true, modelARV: true, modelARVConfidenceDetail: true,
    },
  });

  for (const l of top) {
    console.log(`${l.address}, ${l.city} ${l.zipCode} | $${l.listPrice.toLocaleString()} | Score: ${l.flipVelocityScore}`);
    console.log(`  Opp: ${l.opportunityScore} (x0.40=${(l.opportunityScore! * 0.4).toFixed(0)}) | ZIP: ${l.zipAbsorptionScore} (x0.30=${(l.zipAbsorptionScore! * 0.3).toFixed(0)}) | Reno: ${l.renoScopeScore} (x0.20=${(l.renoScopeScore! * 0.2).toFixed(0)}) | Buyer: ${l.buyerPoolScore} (x0.10=${(l.buyerPoolScore! * 0.1).toFixed(0)})`);
    console.log(`  ARV: $${l.modelARV?.toLocaleString() || 'N/A'} (${l.modelARVConfidenceDetail || 'none'})`);
    console.log();
  }

  const zipCounts = await prisma.zipBenchmark.count();
  const compCounts = await prisma.comp.count();
  console.log(`ZIP Benchmarks in DB: ${zipCounts}`);
  console.log(`Comps in DB: ${compCounts}`);

  await prisma.$disconnect();
}

checkScores().catch(console.error);
