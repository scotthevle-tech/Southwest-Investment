/**
 * Retry Utility with Exponential Backoff
 * Handles transient failures gracefully
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute function with exponential backoff retry
 * @param fn - Function to execute
 * @param options - Retry configuration
 * @returns Result from function on success
 * @throws Error after max retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries!; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // On last attempt, throw immediately
      if (attempt === config.maxRetries) {
        throw new Error(
          `Failed after ${config.maxRetries} retries: ${lastError.message}`,
        );
      }

      // Calculate exponential backoff delay
      const delayMs = Math.min(
        config.initialDelayMs! * Math.pow(config.backoffMultiplier!, attempt),
        config.maxDelayMs!,
      );

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${config.maxRetries} failed. Retrying in ${delayMs}ms. Error: ${lastError.message}`,
      );

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Retry exhausted: ${lastError?.message}`);
}

/**
 * Create a circuit breaker wrapper
 * Fails fast if service is down
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If open, check if we should try half-open
    if (this.state === 'OPEN') {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.resetTimeoutMs
      ) {
        this.state = 'HALF_OPEN';
        console.log('[CircuitBreaker] State: HALF_OPEN - testing recovery');
      } else {
        throw new Error(
          `[CircuitBreaker] Circuit OPEN - service unavailable`,
        );
      }
    }

    try {
      const result = await fn();

      // Success - reset state
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        console.log('[CircuitBreaker] State: CLOSED - service recovered');
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        console.error(
          `[CircuitBreaker] State: OPEN - failure threshold reached (${this.failureCount}/${this.failureThreshold})`,
        );
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
