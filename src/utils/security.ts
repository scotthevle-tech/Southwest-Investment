/**
 * API Security & Authentication
 * Provides API key validation and rate limiting
 */

import crypto from 'crypto';

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyHash: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

/**
 * API Key Manager
 * Simple in-memory API key store (extend with database storage as needed)
 */
export class ApiKeyManager {
  private keys = new Map<string, ApiKeyInfo>();

  constructor() {
    // Initialize with any pre-configured keys if available
    // In production, load from secure secrets manager
  }

  /**
   * Hash an API key for storage (one-way)
   */
  hashKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Generate a new API key
   */
  generateKey(): string {
    return `sw_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Validate an API key
   */
  async validateKey(apiKey: string): Promise<boolean> {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    try {
      const hash = this.hashKey(apiKey);
      const record = this.keys.get(hash);

      if (
        record &&
        record.isActive &&
        (!record.expiresAt || record.expiresAt > new Date())
      ) {
        // Update last used timestamp
        record.lastUsedAt = new Date();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  /**
   * Create a new API key record
   */
  async createKey(
    name: string,
    expiresAt?: Date,
  ): Promise<{ key: string; hash: string }> {
    const key = this.generateKey();
    const hash = this.hashKey(key);

    this.keys.set(hash, {
      id: crypto.randomUUID(),
      name,
      keyHash: hash,
      isActive: true,
      createdAt: new Date(),
      expiresAt,
    });

    console.log(`[API Key] Created key for: ${name}`);
    return { key, hash };
  }

  /**
   * Revoke an API key
   */
  async revokeKey(hash: string): Promise<void> {
    const record = this.keys.get(hash);
    if (record) {
      record.isActive = false;
      console.log(`[API Key] Revoked key: ${record.name}`);
    }
  }
}

/**
 * Rate Limiter
 * Track and enforce rate limits per client
 */
export class RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private requestsPerMinute = 100,
    private cleanupIntervalMs = 60000,
  ) {
    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  /**
   * Check if request is allowed
   */
  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(clientId);

    if (!bucket || now > bucket.resetAt) {
      // New window
      this.buckets.set(clientId, {
        count: 1,
        resetAt: now + 60000, // 1 minute
      });
      return true;
    }

    // Within window
    if (bucket.count < this.requestsPerMinute) {
      bucket.count++;
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests for client
   */
  getRemaining(clientId: string): number {
    const bucket = this.buckets.get(clientId);
    if (!bucket || Date.now() > bucket.resetAt) {
      return this.requestsPerMinute;
    }
    return Math.max(0, this.requestsPerMinute - bucket.count);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [clientId, bucket] of this.buckets.entries()) {
      if (now > bucket.resetAt) {
        this.buckets.delete(clientId);
      }
    }
  }
}

/**
 * Get client identifier (IP or API key hash)
 */
export function getClientId(
  req: { headers?: Record<string, string>; ip?: string },
): string {
  const apiKey = req.headers?.['x-api-key'];
  if (apiKey) {
    // Use key hash as identifier
    return crypto.createHash('sha256').update(String(apiKey)).digest('hex');
  }
  // Fallback to IP
  return req.ip || 'unknown';
}

/**
 * Audit Logger
 * Track sensitive operations
 */
export class AuditLogger {
  async log(
    action: string,
    userId: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      console.log(
        `[AUDIT] Action: ${action}, User: ${userId}, Details: ${JSON.stringify(details)}`,
      );

      // Could store in database if needed
      // In production, integrate with centralized logging system
    } catch (error) {
      console.error('Error logging audit:', error);
    }
  }
}
