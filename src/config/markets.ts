/**
 * Market configuration and constants for Southwest Investment
 * Update buyer pool ranges quarterly based on market data
 */

export const MARKETS = {
  LAS_VEGAS: 'Las Vegas',
  ST_GEORGE: 'St. George',
  CEDAR_CITY: 'Cedar City',
} as const;

export const HARD_FILTERS = {
  MAX_LIST_PRICE: 500000,
  MAX_ARV_TARGET: 600000,
  MAX_HOA_MONTHLY: 100,
  MIN_BEDROOMS: 2,
  PROPERTY_TYPE: 'SFR',
  WATER_SOURCE_REJECT: ['well', 'private well', 'spring', 'cistern', 'hauled'],
  STATUS: 'Active',
} as const;

export const BUYER_POOL_RANGES = {
  'Las Vegas': [
    { min: 280000, max: 420000, score: 100, label: 'Peak demand -- largest buyer pool' },
    { min: 420000, max: 500000, score: 80, label: 'Strong demand' },
    { min: 500000, max: 560000, score: 60, label: 'Good demand' },
    { min: 560000, max: 600000, score: 40, label: 'Smaller pool near ceiling' },
  ],
  'St. George': [
    { min: 320000, max: 460000, score: 100, label: 'Peak demand' },
    { min: 460000, max: 530000, score: 80, label: 'Strong demand' },
    { min: 530000, max: 575000, score: 60, label: 'Good demand' },
    { min: 575000, max: 600000, score: 40, label: 'Smaller pool near ceiling' },
  ],
  'Cedar City': [
    { min: 240000, max: 360000, score: 100, label: 'Peak demand' },
    { min: 360000, max: 430000, score: 80, label: 'Strong demand' },
    { min: 430000, max: 490000, score: 60, label: 'Good demand' },
    { min: 490000, max: 600000, score: 35, label: 'Thinner pool for Cedar City' },
  ],
} as const;

export const RENOVATION_KEYWORDS = [
  'updated',
  'renovated',
  'remodeled',
  'new kitchen',
  'new flooring',
  'new roof',
  'new hvac',
  'new cabinets',
  'new counters',
  'move-in ready',
  'turnkey',
  'upgraded',
  'new appliances',
  'fresh paint',
  'new carpet',
] as const;

export const MOTIVATED_SELLER_KEYWORDS = {
  HIGH_SIGNAL: [
    'estate',
    'probate',
    'as-is',
    'fixer',
    'investor',
    'motivated',
    'must sell',
    'bring offers',
    'relocation',
    'divorce',
    'bank owned',
    'reo',
    'cash only',
    'handyman special',
    'price reduced',
  ],
  MEDIUM_SIGNAL: [
    'tlc',
    'needs work',
    'cosmetic',
    'sell fast',
    'handyman',
    'updating needed',
    'below market',
    'dated',
    'original condition',
  ],
} as const;

export const FLIP_VELOCITY_WEIGHTS = {
  OPPORTUNITY: 0.4,
  ZIP_ABSORPTION: 0.3,
  RENO_SCOPE: 0.2,
  BUYER_POOL: 0.1,
} as const;

export const FLIP_VELOCITY_THRESHOLDS = {
  HIGH_VELOCITY_MIN: 70,
  EVALUATE_MIN: 40,
  TRACK_ONLY_MAX: 39,
} as const;

export const DOM_MILESTONES = [30, 60, 90, 120, 180] as const;

export const ZIP_ABSORPTION_THRESHOLDS = {
  VERY_FAST_DOM: 21,     // <= 21 days = 100 score
  FAST_DOM: 35,          // <= 35 days = 80 score
  MODERATE_DOM: 50,      // <= 50 days = 60 score
  SLOW_DOM: 75,          // <= 75 days = 40 score
  VERY_SLOW_DOM: 75,     // > 75 days = 20 score

  VERY_FAST_VELOCITY: 5,    // >= 5 sales/mo = 100 score
  FAST_VELOCITY: 3,         // >= 3 sales/mo = 75 score
  MODERATE_VELOCITY: 2,     // >= 2 sales/mo = 50 score
  SLOW_VELOCITY: 2,         // < 2 sales/mo = 25 score

  MIN_COMPS_FOR_ZIP: 3,
} as const;

export const RENO_SCOPE_PENALTIES = {
  PRE_1978: 15,       // Lead paint risk
  PRE_1990: 8,        // HVAC replacement likely
  POOL: 15,           // Mechanical condition unknown
  UNKNOWN_SEWER: 10,  // Status unverified
  FOUNDATION: 20,     // Structural risk
  ROOF: 10,           // Verify age/condition
  ELECTRICAL: 10,     // May need work
  PLUMBING: 10,       // Unknown scope
  MOLD: 20,           // Remediation risk
  FIRE_DAMAGE: 25,    // Significant scope risk
  WATER_DAMAGE: 15,   // Unknown scope
  AS_IS: 5,           // Seller disclosing unknowns
} as const;

export const RENO_SCOPE_BONUSES = {
  COSMETIC_POSITIVE: 10, // Paint/floors likely
} as const;
