/**
 * Input Validation Utilities
 * Prevents crashes and security issues from invalid data
 */

/**
 * Safely parse a number, return default if invalid
 */
export function safeNumber(value: any, defaultValue = 0): number {
  const num = Number(value);
  return isFinite(num) ? num : defaultValue;
}

/**
 * Safely parse a string, trim whitespace
 */
export function safeString(value: any, defaultValue = ''): string {
  return typeof value === 'string' ? value.trim() : defaultValue;
}

/**
 * Safely parse a boolean
 */
export function safeBoolean(value: any, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return defaultValue;
}

/**
 * Validate array bounds
 */
export function boundedArray<T>(arr: any[] | undefined, maxSize = 100): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, Math.min(arr.length, maxSize));
}

/**
 * Validate property price range
 */
export function validatePrice(price: any): number {
  const validated = safeNumber(price, 0);
  return Math.max(0, Math.min(validated, 999_999_999)); // Practical limit
}

/**
 * Validate listing count
 */
export function validateCount(count: any): number {
  const validated = safeNumber(count, 0);
  return Math.max(0, Math.floor(validated));
}

/**
 * Prevent division by zero
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  defaultValue = 0,
): number {
  if (denominator === 0 || !isFinite(denominator)) {
    return defaultValue;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : defaultValue;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Validate percentage (0-100)
 */
export function validatePercentage(value: any): number {
  return clamp(safeNumber(value, 0), 0, 100);
}

/**
 * Validate market name
 */
export function validateMarket(
  market: any,
): 'Las Vegas' | 'St. George' | 'Cedar City' {
  const validMarkets = ['Las Vegas', 'St. George', 'Cedar City'];
  if (validMarkets.includes(market)) {
    return market as 'Las Vegas' | 'St. George' | 'Cedar City';
  }
  return 'Las Vegas'; // Default
}

/**
 * Sanitize string for database (basic protection)
 */
export function sanitizeString(value: string, maxLength = 1000): string {
  return safeString(value)
    .slice(0, maxLength)
    .replace(/[\0\n\r\x1a]/g, ''); // Remove dangerous characters
}

/**
 * Validate date
 */
export function validateDate(value: any, defaultValue = new Date()): Date {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  const parsed = new Date(value);
  return !isNaN(parsed.getTime()) ? parsed : defaultValue;
}

/**
 * Calculate percentage change safely
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number,
): number {
  if (oldValue === 0) return 0; // Avoid division by zero
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Validate listing data structure
 */
export interface ValidatedListing {
  mlsNumber: string;
  address: string;
  zipCode: string;
  listPrice: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  market: 'Las Vegas' | 'St. George' | 'Cedar City';
}

export function validateListingData(data: any): ValidatedListing {
  return {
    mlsNumber: sanitizeString(data?.mlsNumber || '', 50),
    address: sanitizeString(data?.address || '', 200),
    zipCode: sanitizeString(data?.zipCode || '', 10),
    listPrice: validatePrice(data?.listPrice),
    bedrooms: validateCount(data?.bedrooms),
    bathrooms: validateCount(data?.bathrooms),
    sqft: validateCount(data?.sqft),
    market: validateMarket(data?.market),
  };
}

/**
 * Type guard for unknown values
 */
export function isValidObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard for arrays
 */
export function isValidArray<T>(value: any): value is T[] {
  return Array.isArray(value);
}
