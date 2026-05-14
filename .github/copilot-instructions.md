<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Southwest Investment Software — Copilot Instructions

## Project Overview

**Southwest Investment Software** is a TypeScript/Node.js application that analyzes SFR properties across three markets (Las Vegas, St. George, Cedar City) and ranks them by **Flip Velocity Score** for real estate investment evaluation.

**Current Status:** Phase 1 scaffolding complete. All scoring algorithms and data models ready. Awaiting MLS API keys to implement connectors.

---

## Architecture Principles

1. **Three-Tier Processing Pipeline**
   - Tier 1: Full analysis (new listings)
   - Tier 2: Delta checks (nightly, fast)
   - Tier 3: Watch list (manual priority re-scores)

2. **Flip Velocity Score (0-100)**
   - Opportunity(40%) + ZIP Absorption(30%) + Reno Scope(20%) + Buyer Pool(10%)
   - Replaces raw opportunity score as PRIMARY ranking metric
   - Thresholds: 70+ High Velocity | 40-69 Evaluate | 0-39 Track Only

3. **Pure Scoring Functions**
   - All analyzer logic is deterministic
   - No external API calls during scoring
   - All data from Prisma database

4. **Hard Filters**
   - Max list price: $500K
   - Max ARV: $600K
   - Max HOA: $100/mo
   - Min beds: 2
   - Property type: SFR only
   - Status: Active only
   - Water: Municipal only

---

## Code Organization

### `src/types/` — TypeScript Interfaces
- `Listing` - Standard listing object
- `Comp` - Comparable sales
- `ZipBenchmark` - Market metrics
- Various score result types

### `src/config/` — Constants & Market Data
- Market definitions (Las Vegas, St. George, Cedar City)
- Hard filter thresholds
- Buyer pool ranges (quarterly updates)
- Renovation/motivation keywords
- Scoring weights and thresholds

### `src/analyzer/` — Pure Scoring Logic
Each module is a service class with one main `calculate()` method:

1. **opportunity-scorer.ts**
   - Price vs market $/SF
   - DOM vs ZIP average
   - Price reductions
   - Motivated seller keywords
   - Property age + condition
   - Market flags

2. **zip-absorption-scorer.ts**
   - Median DOM of sold comps
   - Sales velocity per month
   - Fallback to city average if <3 comps

3. **reno-scope-scorer.ts**
   - Year built risk
   - Pool penalty (LV/SG)
   - Structural/system keywords
   - Cosmetic positive signals

4. **buyer-pool-scorer.ts**
   - Market-specific ARV ranges
   - Peak vs secondary demand zones

5. **arv-estimator.ts**
   - HIGH-RENOVATED (5+ renovated comps)
   - MEDIUM-BLENDED (2-4 comps, mix)
   - MEDIUM-GENERAL (general comps only)
   - LOW (<3 comps, manual review needed)

6. **flip-velocity-scorer.ts**
   - Master score combining all components
   - Weighted normalization (0-100 scale)
   - Level assignment (High Velocity/Evaluate/Track Only)

7. **competitive-inventory-scorer.ts**
   - Count similar active listings in ZIP near ARV
   - Context only (not in main Flip Velocity formula)

### `src/connectors/` — MLS Data Source Abstraction
- **base-connector.ts** - Abstract class with config validation
- **mlxchange-connector.ts** - Las Vegas (Clark Co., NV)
- **flex-connector.ts** - St. George (Washington Co., UT) & Cedar City (Iron Co., UT)

**Status:** Framework complete. API methods stubbed with TODO comments. Ready for real endpoint integration when keys arrive.

### `src/services/` — Business Logic
- **listing-normalizer.ts** - Raw MLS → Listing format, hard filter validation
- **report-generator.ts** - HTML/text morning report generation

**TODO:**
- **pipeline-orchestrator.ts** - Tier 1/2/3 runner
- **price-alert.ts** - >=5% drop detection
- **dom-alert.ts** - DOM milestone detection

### `prisma/` — Database Schema
- 8 tables: Listing, Comp, ZipBenchmark, PriceAlert, DOMAlert, RunLog, AnalysisResult, etc.
- Full field support for all scoring components
- Indexed on market, zipCode, flipVelocityScore, dates

---

## Development Workflow

### When adding a new scoring component:
1. Add constants to `src/config/markets.ts`
2. Create analyzer service in `src/analyzer/`
3. Implement `calculate()` method
4. Add result type to `src/types/index.ts`
5. Update FlipVelocityScorerService to include new weight

### When implementing MLS connectors:
1. Swap placeholder URLs/auth in connector
2. Map connector field names to ConnectorRawListing
3. Implement pagination for large result sets
4. Handle connector-specific error codes
5. Test normalization through ListingNormalizerService

### When building Tier processors:
1. Use services in `src/services/` for normalization & reporting
2. Use analyzer services for scoring
3. Store scores + results in Prisma
4. Log run details to RunLog table
5. Generate morning report at end

---

## Key Files to Know

- **README.md** — Full documentation
- **prisma/schema.prisma** — Database schema
- **.env.example** — All required env vars
- **package.json** — Dependencies, scripts
- **tsconfig.json** — TypeScript config

---

## Testing Approach

Since we're waiting on API keys:

1. **Scoring functions** can be tested immediately
   - Mock Listing objects
   - Mock benchmark data
   - Verify score calculations

2. **When APIs arrive:**
   - Test one connector at a time
   - Batch import 100-200 listings
   - Validate normalization pipeline
   - Verify hard filter logic
   - Compare scores to manual expectations

3. **Pipeline testing:**
   - Run Tier 1 on historical batch
   - Run Tier 2 daily on subset
   - Validate alert thresholds

---

## Common Patterns

### Accessing market config:
```typescript
import { BUYER_POOL_RANGES, HARD_FILTERS } from './config/markets';

const ranges = BUYER_POOL_RANGES['Las Vegas'];
if (price > HARD_FILTERS.MAX_LIST_PRICE) { /* fail */ }
```

### Creating scorer service:
```typescript
import { OpportunityScorerService } from './analyzer/opportunity-scorer';

const scorer = new OpportunityScorerService();
const result = await scorer.calculate(listing, marketAvgPSF, zipAvgDOM);
```

### Normalizing raw MLS data:
```typescript
import { ListingNormalizerService } from './services/listing-normalizer';

const normalizer = new ListingNormalizerService();
const result = normalizer.normalize(rawMlsData, 'Las Vegas');
if (result.passed) { /* store result.listing */ }
```

### Combining scores:
```typescript
import { FlipVelocityScorerService } from './analyzer/flip-velocity-scorer';

const flipVelocity = new FlipVelocityScorerService();
const result = flipVelocity.calculate(opp, zip, reno, buyer);
// result.flipVelocityScore (0-100)
// result.flipVelocityLevel ('High Velocity' | 'Evaluate' | 'Track Only')
```

---

## TODO: Next Phases

### Phase 1 — API Integration (when keys arrive)
- [ ] Implement MLXchange connector
- [ ] Implement Flex connectors (Washington & Iron)
- [ ] Add pagination handling
- [ ] Test with real MLS batch

### Phase 2 — Pipeline Orchestration
- [ ] Build Tier 1 processor
- [ ] Build Tier 2 processor
- [ ] Build Tier 3 processor
- [ ] DOM milestone detection
- [ ] Price drop detection

### Phase 3 — Reporting & Scheduling
- [ ] Email integration (Nodemailer)
- [ ] node-cron scheduling
- [ ] HTML report templates
- [ ] Optional Claude insights

### Phase 4 — Enhancements
- [ ] Web dashboard (Next.js)
- [ ] Offer price recommendations
- [ ] Reno budget estimation
- [ ] Performance tracking

---

## Debugging Tips

1. **Scoring seems off?** Check hard filters first (ListingNormalizerService)
2. **API connection fails?** Verify env vars and BaseConnector.validateConfig()
3. **Missing ARV estimation?** Check comp count — may need >3 for MEDIUM confidence
4. **ZIP metrics wrong?** Verify ZipBenchmark has enough 90-day sold comps
5. **Report looks broken?** Check MorningReportGeneratorService HTML template

---

## Contact & Links

- **Design Doc:** `SouthwestInvestment_ClaudeCode_v9.md` (parent folder)
- **Metrics:** Flip Velocity = Opportunity(40%) + ZIP Absorption(30%) + Reno Scope(20%) + Buyer Pool(10%)
- **Markets:** Las Vegas (Clark Co., NV), St. George (Washington Co., UT), Cedar City (Iron Co., UT)

---

**Ready to scale when MLS APIs arrive!**
