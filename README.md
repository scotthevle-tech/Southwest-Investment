# Southwest Investment Software

**Automated property flip analysis and prioritization system** for Southern Utah and Southern Nevada markets (Las Vegas, St. George, Cedar City).

## Overview

This TypeScript/Node.js application analyzes single-family rental (SFR) properties from multiple MLS data sources and ranks them by **Flip Velocity Score** — a composite metric measuring purchase opportunity, market absorption speed, renovation scope predictability, and buyer pool demand.

**Target outcome:** Daily morning report identifying the highest-priority properties for manual evaluation and offer strategy.

---

## Architecture

### Three-Tier Processing Pipeline

1. **Tier 1 - New Listings** (full analysis pipeline, once per listing ever)
   - Raw data normalization + hard filter validation
   - Opportunity scoring
   - ARV estimation
   - ZIP absorption analysis
   - Reno risk assessment
   - Buyer pool scoring
   - Competitive inventory check
   - Flip Velocity Score calculation + storage

2. **Tier 2 - Delta Check** (all active listings, every night, fast)
   - Pull price + status only
   - Flag price reductions (>=5% triggers re-score)
   - Track DOM milestones (30/60/90/120/180)
   - Alert on status changes

3. **Tier 3 - Watch List** (manually flagged properties, highest sensitivity)
   - Re-score every DOM increment
   - Immediate alert on ANY change
   - Priority prioritization in reports

### Flip Velocity Score (0-100)

Composite ranking metric combining:

```
Flip Velocity = 
  (Opportunity Score      × 0.40) +  // Can we buy it right?
  (ZIP Absorption Score   × 0.30) +  // Will it sell fast?
  (Reno Scope Score       × 0.20) +  // Is reno predictable?
  (Buyer Pool Score       × 0.10)    // Is ARV in peak demand?
```

Thresholds:
- **70-100:** High Velocity (pre-analyzed)
- **40-69:** Evaluate
- **0-39:** Track Only

---

## Scoring Components

### 1. Opportunity Score
Measures: Can we buy it right?
- Price vs market $/SF (30 pts)
- DOM vs ZIP average (20 pts)
- Price reductions (15 pts)
- Motivated seller keywords (20 pts)
- Property age + condition (10 pts)
- Market flags (±5 pts)

**Max: 100 pts**

### 2. ZIP Absorption Score
Measures: Will it sell fast in this ZIP?
- Median DOM of sold comps (90 days) — 60% weight
- Sales velocity per month — 40% weight

**Requires:** 3+ sold comps in ZIP (fallback to city average if insufficient)

### 3. Reno Scope Score
Measures: Is the renovation predictable and low-risk?
- Start at 100, deduct for risk factors:
  - Pre-1978: -15 (lead paint)
  - Pre-1990: -8 (HVAC likely)
  - Pool: -15 (LV/SG only)
  - Foundation/roof/electrical: -10 to -20 each
  - Structural damage: -15 to -25

**Risk Levels:** LOW (80+) | MEDIUM (60-79) | HIGH (<60)

### 4. Buyer Pool Score
Measures: Is estimated ARV in peak buyer demand range?
- Market-specific ARV ranges updated quarterly
- Las Vegas: $280K-$420K peak demand
- St. George: $320K-$460K peak demand
- Cedar City: $240K-$360K peak demand

### 5. ARV Estimation
Three confidence levels:
- **HIGH-RENOVATED:** 5+ comps with renovation keywords
- **MEDIUM-BLENDED:** 3-4 comps, mix of renovated + general
- **MEDIUM-GENERAL:** 3-4 general comps, no renovated
- **LOW:** <3 comps (flagged for manual review)

Uses weighted $/SF based on recency and proximity.

---

## Data Models (Prisma)

### Core Tables

- **Listing** - Single listing from MLS (400+ fields for full property detail)
- **Comp** - Comparable sold property
- **ZipBenchmark** - Market metrics by ZIP (updated weekly)
- **PriceAlert** - Price drop notifications
- **DOMAlert** - DOM milestone alerts
- **RunLog** - Processing run history
- **AnalysisResult** - Detailed scoring breakdown

---

## Project Structure

```
src/
├── index.ts                          # Entry point
├── types/
│   └── index.ts                      # Core TypeScript interfaces
├── config/
│   └── markets.ts                    # Market constants, thresholds, keywords
├── analyzer/
│   ├── opportunity-scorer.ts         # Opportunity Score logic
│   ├── zip-absorption-scorer.ts      # ZIP Absorption Score logic
│   ├── reno-scope-scorer.ts          # Reno Scope Score logic
│   ├── buyer-pool-scorer.ts          # Buyer Pool Score logic
│   ├── arv-estimator.ts              # ARV estimation logic
│   ├── flip-velocity-scorer.ts       # Master Flip Velocity Score
│   └── competitive-inventory-scorer.ts  # Context scoring
├── connectors/
│   ├── base-connector.ts             # Abstract connector class
│   ├── mlxchange-connector.ts        # MLXchange API (Las Vegas)
│   └── flex-connector.ts             # Flex API (St. George, Cedar City)
├── services/
│   ├── listing-normalizer.ts         # Raw→Standard format + hard filters
│   ├── report-generator.ts           # HTML/text report generation
│   └── (pipeline-orchestrator.ts)    # TODO: Tier 1/2/3 runner
└── utils/
    └── (logger.ts, db.ts)            # TODO: Utilities

prisma/
├── schema.prisma                     # Database schema
└── migrations/                       # DB migration history

.github/
└── copilot-instructions.md           # This file structure + next steps

.env.example                          # Environment variable template
package.json
tsconfig.json
```

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys:
# - MLXCHANGE_BASE_URL, MLXCHANGE_API_KEY
# - FLEX_WASHINGTON_BASE_URL, FLEX_WASHINGTON_API_KEY
# - FLEX_IRON_BASE_URL, FLEX_IRON_API_KEY
# - ANTHROPIC_API_KEY (Claude 3.5 Sonnet)
# - SMTP_* (email configuration)
```

### 3. Database Setup

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Development

```bash
npm run dev
```

---

## TODO: Next Implementation Phases

### Phase 1: API Integration (when keys arrive)
- [ ] Implement MLXchange connector (`fetchNewListings`, `fetchDeltaCheck`)
- [ ] Implement Flex connectors (Washington, Iron)
- [ ] Add pagination handling for large result sets
- [ ] Test with real MLS data (batch import if available)

### Phase 2: Pipeline Orchestration
- [ ] Build Tier 1 processor (full analysis)
- [ ] Build Tier 2 processor (delta checks)
- [ ] Build Tier 3 processor (watchlist re-scores)
- [ ] Implement DOM milestone detection
- [ ] Implement price drop detection

### Phase 3: Reporting & Scheduling
- [ ] Complete report generation (HTML email)
- [ ] Set up Nodemailer SMTP
- [ ] Implement node-cron scheduling (daily 8am, nightly delta)
- [ ] Add Claude API for optional property insights

### Phase 4: Enhancements
- [ ] Build a simple web dashboard (Next.js optional)
- [ ] Implement offer price recommendations ($20%, $15% ARV)
- [ ] Add reno budget estimation engine
- [ ] Historical performance tracking

---

## Scoring Algorithm Summary

All scoring components are **pure functions** in `src/analyzer/`. They require:
- Property data (Listing object)
- Market benchmark data (ZIP metrics)
- Comparable sales data (for ARV)

**No external API calls** in scoring logic — all data comes from Prisma database.

---

## Environment Variables

```bash
# MLS APIs (configure when keys available)
MLXCHANGE_BASE_URL=
MLXCHANGE_API_KEY=
MLXCHANGE_SAVED_SEARCH_ID=

FLEX_WASHINGTON_BASE_URL=
FLEX_WASHINGTON_API_KEY=
FLEX_WASHINGTON_SAVED_SEARCH_ID=

FLEX_IRON_BASE_URL=
FLEX_IRON_API_KEY=
FLEX_IRON_SAVED_SEARCH_ID=

# Database
DATABASE_URL=file:./dev.db    # SQLite for dev; upgrade to PostgreSQL for production

# Claude API
ANTHROPIC_API_KEY=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
REPORT_EMAIL_TO=scott@example.com

# App
NODE_ENV=development
LOG_LEVEL=info
```

---

## Key Design Decisions

1. **SQLite for dev, upgrade to PostgreSQL for production**
2. **Three-tier processing** prevents API overuse while maintaining freshness
3. **Flip Velocity Score as primary ranking** (not raw opportunity score)
4. **Market-specific buyer pool ranges** updated quarterly
5. **Confidence flags on ARV** (HIGH-RENOVATED, MEDIUM-BLENDED, LOW)
6. **DOM milestones** trigger automatic re-scoring and alerts
7. **Pure scoring functions** (no API calls in analyzer/)

---

## Contact & Documentation

- **Design Doc:** See SouthwestInvestment_ClaudeCode_v9.md
- **Architecture:** Flip Velocity = Opportunity(40%) + ZIP Absorption(30%) + Reno Scope(20%) + Buyer Pool(10%)

---

**Status:** Scaffolded & ready for API integration. All scoring algorithms and data models complete. Awaiting MLXchange (Washington Co.) API keys to begin Tier 1/2/3 pipeline testing.
