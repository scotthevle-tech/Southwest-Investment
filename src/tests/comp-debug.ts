import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debug() {
  console.log('=== Comp Data Debug ===\n');

  const zips = ['84721', '84738', '84745', '84780'];

  for (const zip of zips) {
    const comps = await prisma.comp.findMany({
      where: { zipCode: zip, soldDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      orderBy: { soldDate: 'desc' },
      take: 15,
    });

    if (comps.length === 0) {
      console.log(`ZIP ${zip}: No comps\n`);
      continue;
    }

    console.log(`ZIP ${zip}: ${comps.length} comps (last 90 days)`);
    let totalPSF = 0;
    for (const c of comps) {
      const psf = c.sqft > 0 ? Math.round(c.soldPrice / c.sqft) : 0;
      totalPSF += psf;
      console.log(`  ${c.address} | Sold: $${c.soldPrice.toLocaleString()} | ${c.sqft} sqft | $${psf}/sf | ${c.isRenovated ? 'RENO' : 'general'} | DOM ${c.domAtSale}`);
    }
    console.log(`  Avg $/SF: $${Math.round(totalPSF / comps.length)}`);
    console.log();
  }

  // Check for any comps with absurd $/SF
  console.log('=== Outlier Check: Comps with $/SF > $500 ===');
  const allComps = await prisma.comp.findMany({
    where: { soldDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
  });
  const outliers = allComps.filter(c => c.sqft > 0 && (c.soldPrice / c.sqft) > 500);
  console.log(`Found ${outliers.length} outliers out of ${allComps.length} total comps\n`);
  for (const c of outliers.slice(0, 20)) {
    const psf = Math.round(c.soldPrice / c.sqft);
    console.log(`  ${c.address}, ${c.city} ${c.zipCode} | $${c.soldPrice.toLocaleString()} / ${c.sqft} sqft = $${psf}/sf`);
  }

  // Also check for comps with very small sqft (potential data errors)
  console.log('\n=== Comps with sqft < 100 (likely data errors) ===');
  const tinyComps = allComps.filter(c => c.sqft > 0 && c.sqft < 100);
  console.log(`Found ${tinyComps.length} comps with sqft < 100\n`);
  for (const c of tinyComps) {
    const psf = Math.round(c.soldPrice / c.sqft);
    console.log(`  ${c.address}, ${c.city} ${c.zipCode} | $${c.soldPrice.toLocaleString()} / ${c.sqft} sqft = $${psf}/sf`);
  }

  await prisma.$disconnect();
}

debug().catch(async (e) => { console.error(e); await prisma.$disconnect(); });
