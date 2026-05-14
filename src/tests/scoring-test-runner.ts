/**
 * Test Runner
 * Validates scoring algorithms end-to-end without real MLS APIs
 *
 * Run with: npm run test:scoring
 */

import { OpportunityScorerService } from '../analyzer/opportunity-scorer';
import { ZipAbsorptionScorerService } from '../analyzer/zip-absorption-scorer';
import { RenoScopeScorerService } from '../analyzer/reno-scope-scorer';
import { BuyerPoolScorerService } from '../analyzer/buyer-pool-scorer';
import { ARVEstimatorService } from '../analyzer/arv-estimator';
import { FlipVelocityScorerService } from '../analyzer/flip-velocity-scorer';
import { ListingNormalizerService } from '../services/listing-normalizer';
import { PriceAlertService } from '../services/price-alert';
import { DOMAlertService } from '../services/dom-alert';
import {
  SAMPLE_LAS_VEGAS_LISTINGS,
  SAMPLE_SOLD_COMPS_LV,
  SAMPLE_ZIP_BENCHMARK_89102,
} from '../utils/test-fixtures';
import { Listing } from '../types';

async function runScoringTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('SOUTHWEST INVESTMENT SOFTWARE — SCORING ALGORITHM TEST RUNNER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const normalizer = new ListingNormalizerService();
  const opportunityScorer = new OpportunityScorerService();
  const zipAbsorptionScorer = new ZipAbsorptionScorerService();
  const renoScopeScorer = new RenoScopeScorerService();
  const buyerPoolScorer = new BuyerPoolScorerService();
  const arvEstimator = new ARVEstimatorService();
  const flipVelocityScorer = new FlipVelocityScorerService();
  const priceAlertService = new PriceAlertService();
  const domAlertService = new DOMAlertService();

  // Test 1: Normalization and Hard Filters
  console.log('TEST 1: Listing Normalization & Hard Filter Validation');
  console.log('─────────────────────────────────────────────────────────────');
  const normalized = normalizer.normalizeBatch(SAMPLE_LAS_VEGAS_LISTINGS, 'Las Vegas');
  console.log(`✓ Normalized ${normalized.normalized.length} listings`);
  console.log(`✓ Rejected ${normalized.failed.length} (hard filter violations)`);
  normalized.failed.forEach(f => console.log(`  - ${f.mls}: ${f.failures.join(', ')}`));
  console.log();

  if (normalized.normalized.length === 0) {
    console.error('ERROR: No listings passed hard filters');
    return;
  }

  const listing = normalized.normalized[0];
  console.log(`Testing with: ${listing.address} (${listing.mlsNumber})`);
  console.log();

  // Test 2: Opportunity Score
  console.log('TEST 2: Opportunity Score Calculation');
  console.log('─────────────────────────────────────────────────────────────');
  const oppResult = await opportunityScorer.calculate(
    listing,
    SAMPLE_ZIP_BENCHMARK_89102.avgPSFActive,
    SAMPLE_ZIP_BENCHMARK_89102.avgDOMActive,
  );
  console.log(`Opportunity Score: ${oppResult.opportunityScore}`);
  console.log(`  Price/SF Score:      ${oppResult.breakdown.pricePSFScore}`);
  console.log(`  DOM Score:           ${oppResult.breakdown.domScore}`);
  console.log(`  Price Reduction:     ${oppResult.breakdown.priceReductionScore}`);
  console.log(`  Motivated Keywords:  ${oppResult.breakdown.motivatedSellerScore}`);
  console.log(`  Property Age:        ${oppResult.breakdown.propertyAgeScore}`);
  console.log(`  Market Flags:        ${oppResult.breakdown.marketFlagsScore}`);
  console.log(`Matched keywords: ${oppResult.motivatedKeywords.join(', ') || 'none'}`);
  console.log();

  // Test 3: ZIP Absorption Score
  console.log('TEST 3: ZIP Absorption Score (Market Velocity)');
  console.log('─────────────────────────────────────────────────────────────');
  const zipResult = await zipAbsorptionScorer.calculate(
    listing,
    SAMPLE_SOLD_COMPS_LV.map(c => ({ domAtSale: c.domAtSale })),
    SAMPLE_ZIP_BENCHMARK_89102.medianDOMSold90d,
    SAMPLE_ZIP_BENCHMARK_89102.salesVelocityPerMo,
  );
  console.log(`ZIP Absorption Score: ${zipResult.zipAbsorptionScore}`);
  console.log(`  Median DOM (90d):    ${zipResult.zipMedianDOM}`);
  console.log(`  Sales/Month:         ${zipResult.zipSalesVelocity}`);
  console.log(`  Comps Used:          ${zipResult.zipSalesCount90d}`);
  console.log(`  Data Confidence:     ${zipResult.zipDataConfidence}`);
  console.log();

  // Test 4: Reno Scope Score
  console.log('TEST 4: Reno Scope Score (Renovation Risk)');
  console.log('─────────────────────────────────────────────────────────────');
  const renoResult = renoScopeScorer.calculate(listing);
  console.log(`Reno Scope Score: ${renoResult.renoScopeScore}`);
  console.log(`  Risk Level:          ${renoResult.renoRiskLevel}`);
  console.log(`  Risk Flags:`);
  renoResult.renoRiskFlags.forEach(flag => console.log(`    - ${flag}`));
  console.log();

  // Test 5: ARV Estimation
  console.log('TEST 5: ARV Estimation (Comparable Sales Analysis)');
  console.log('─────────────────────────────────────────────────────────────');
  const arvResult = await arvEstimator.calculate(
    listing,
    SAMPLE_SOLD_COMPS_LV.map(c => ({
      mlsNumber: c.mlsNumber,
      soldPrice: c.soldPrice,
      sqft: c.sqft,
      soldDate: c.soldDate,
      remarks: c.remarks,
    })),
  );
  console.log(`Model ARV: $${arvResult.modelARV.toLocaleString()}`);
  console.log(`  Confidence Level:    ${arvResult.confidenceLevel}`);
  console.log(`  Comps Used:          ${arvResult.compsUsedCount}`);
  console.log(`  Renovated Comps:     ${arvResult.renovatedCompsCount}`);
  console.log(`  $/SF Used:           $${arvResult.avgPSFUsed}`);
  console.log();

  // Test 6: Buyer Pool Score
  console.log('TEST 6: Buyer Pool Score (Market Demand)');
  console.log('─────────────────────────────────────────────────────────────');
  const buyerResult = buyerPoolScorer.calculate(arvResult.modelARV, 'Las Vegas');
  console.log(`Buyer Pool Score: ${buyerResult.buyerPoolScore}`);
  console.log(`  Label:               ${buyerResult.buyerPoolLabel}`);
  console.log();

  // Test 7: Flip Velocity Score (Master Score)
  console.log('TEST 7: Flip Velocity Score (Master Ranking Metric)');
  console.log('─────────────────────────────────────────────────────────────');
  const flipResult = flipVelocityScorer.calculate(
    oppResult.opportunityScore,
    zipResult.zipAbsorptionScore,
    renoResult.renoScopeScore,
    buyerResult.buyerPoolScore,
  );
  console.log(`╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║ FLIP VELOCITY SCORE: ${flipResult.flipVelocityScore.toString().padStart(2, ' ')}                              ║`);
  console.log(`║ LEVEL: ${flipResult.flipVelocityLevel.padEnd(49, ' ')} ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  console.log();
  console.log(`Breakdown:`);
  console.log(`  Opportunity Score:   ${flipResult.breakdown.opportunityScore} × ${(flipResult.weights.opportunity * 100).toFixed(0)}% = ${Math.round(flipResult.breakdown.opportunityScore * flipResult.weights.opportunity)}`);
  console.log(`  ZIP Absorption:      ${flipResult.breakdown.zipAbsorptionScore} × ${(flipResult.weights.zipAbsorption * 100).toFixed(0)}% = ${Math.round(flipResult.breakdown.zipAbsorptionScore * flipResult.weights.zipAbsorption)}`);
  console.log(`  Reno Scope Score:    ${flipResult.breakdown.renoScopeScore} × ${(flipResult.weights.renoScope * 100).toFixed(0)}% = ${Math.round(flipResult.breakdown.renoScopeScore * flipResult.weights.renoScope)}`);
  console.log(`  Buyer Pool Score:    ${flipResult.breakdown.buyerPoolScore} × ${(flipResult.weights.buyerPool * 100).toFixed(0)}% = ${Math.round(flipResult.breakdown.buyerPoolScore * flipResult.weights.buyerPool)}`);
  console.log();

  // Test 8: Price Alert Detection
  console.log('TEST 8: Price Alert Detection');
  console.log('─────────────────────────────────────────────────────────────');
  const priceAlert = priceAlertService.checkPriceDrop(420000, 400000);
  console.log(`Original: $420,000 → New: $400,000`);
  console.log(`Drop: $${priceAlert?.dropAmount.toLocaleString()} (${priceAlert?.dropPct.toFixed(1)}%)`);
  console.log(`Alert Type: ${priceAlert?.alertType}`);
  console.log(`Should Alert: ${priceAlert?.shouldAlert}`);
  console.log();

  // Test 9: DOM Alert Detection
  console.log('TEST 9: DOM Alert Detection');
  console.log('─────────────────────────────────────────────────────────────');
  const previousListing: Listing = {
    ...listing,
    dom: 85,
    status: 'Active',
  };
  const updatedListing: Listing = {
    ...listing,
    dom: 90,
    status: 'Active',
  };
  const domAlerts = domAlertService.compareListings(previousListing, updatedListing);
  if (domAlerts.length > 0) {
    domAlerts.forEach(alert => {
      console.log(`Alert: ${alert.message}`);
      console.log(`  Type: ${alert.alertType}`);
      console.log(`  Milestone: ${alert.milestone} DOM`);
    });
  } else {
    console.log('No DOM milestones hit');
  }
  console.log();

  // Test 10: Sample Portfolio Analysis
  console.log('TEST 10: Multi-Listing Portfolio Analysis');
  console.log('─────────────────────────────────────────────────────────────');
  for (const rawListing of SAMPLE_LAS_VEGAS_LISTINGS) {
    const normResult = normalizer.normalize(rawListing, 'Las Vegas');
    if (!normResult.passed || !normResult.listing) {
      console.log(`⊘ ${rawListing.mlsNumber}: REJECTED — ${normResult.failures.join(', ')}`);
      continue;
    }

    const opp = await opportunityScorer.calculate(
      normResult.listing,
      SAMPLE_ZIP_BENCHMARK_89102.avgPSFActive,
      SAMPLE_ZIP_BENCHMARK_89102.avgDOMActive,
    );

    const arv = await arvEstimator.calculate(
      normResult.listing,
      SAMPLE_SOLD_COMPS_LV.map(c => ({
        mlsNumber: c.mlsNumber,
        soldPrice: c.soldPrice,
        sqft: c.sqft,
        soldDate: c.soldDate,
        remarks: c.remarks,
      })),
    );

    const zip = await zipAbsorptionScorer.calculate(
      normResult.listing,
      SAMPLE_SOLD_COMPS_LV.map(c => ({ domAtSale: c.domAtSale })),
    );

    const reno = renoScopeScorer.calculate(normResult.listing);
    const buyer = buyerPoolScorer.calculate(arv.modelARV, 'Las Vegas');
    const flip = flipVelocityScorer.calculate(opp.opportunityScore, zip.zipAbsorptionScore, reno.renoScopeScore, buyer.buyerPoolScore);

    const scoreDisplay =
      flip.flipVelocityScore >= 70 ? `✓ ${flip.flipVelocityScore}` : flip.flipVelocityScore >= 40 ? `≈ ${flip.flipVelocityScore}` : `✗ ${flip.flipVelocityScore}`;

    console.log(`${rawListing.mlsNumber.padEnd(15, ' ')} | Score: ${scoreDisplay.padEnd(8, ' ')} | ARV: $${arv.modelARV.toString().padStart(9, ' ')} | ${flip.flipVelocityLevel}`);
  }

  console.log();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ALL TESTS COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run tests
runScoringTests().catch(error => {
  console.error('TEST RUNNER ERROR:', error);
  process.exit(1);
});
