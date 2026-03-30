/**
 * In-memory sliding-window rate limiter.
 *
 * ⚠️  Production note: this Map lives in a single Node.js process.
 *    On serverless / multi-instance deployments replace the store with
 *    Upstash Redis (same algorithm, same API, just a remote ZADD/ZCARD).
 *
 * Algorithm: for each (key, window) we keep a sorted array of timestamps.
 * On every call we:
 *  1. Drop timestamps older than `windowMs`
 *  2. Check whether the remaining count >= limit
 *  3. Append the current timestamp
 *
 * Memory is bounded: at most `limit` timestamps per key, plus a periodic
 * sweep that removes keys whose newest timestamp is older than 2× window.
 */

import { TooManyRequestsError } from "./errors";

interface WindowEntry {
  timestamps: number[];
  lastSeen: number;
}

const store = new Map<string, WindowEntry>();

// Sweep stale keys every 5 minutes to prevent unbounded growth.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

function ensureSweep(windowMs: number) {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const cutoff = Date.now() - windowMs * 2;
    for (const [key, entry] of store) {
      if (entry.lastSeen < cutoff) store.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  // Don't keep Node process alive just for cleanup
  if (sweepTimer.unref) sweepTimer.unref();
}

/**
 * Check & record a request for `key`.
 * Throws `TooManyRequestsError` when the limit is exceeded.
 *
 * @param key       Unique identifier — typically `"rl:userId:endpoint"`
 * @param limit     Maximum allowed requests within the window
 * @param windowMs  Sliding window size in milliseconds (e.g. 60_000 for 1 min)
 */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  ensureSweep(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], lastSeen: now };
    store.set(key, entry);
  }

  // Drop expired timestamps (oldest first)
  let i = 0;
  while (i < entry.timestamps.length && entry.timestamps[i] < cutoff) i++;
  entry.timestamps = entry.timestamps.slice(i);

  if (entry.timestamps.length >= limit) {
    const windowLabel = windowMs < 1000 ? `${windowMs}ms` : `${Math.round(windowMs / 1000)}s`;
    throw new TooManyRequestsError(
      `Rate limit: ${limit} requests per ${windowLabel}`,
    );
  }

  entry.timestamps.push(now);
  entry.lastSeen = now;
}

/**
 * Idempotency store — returns a cached result for a key if it exists,
 * otherwise stores the result with a TTL.
 *
 * ⚠️  Same caveat as above: replace with Upstash Redis for multi-instance.
 */

interface IdemEntry<T> {
  result: T;
  expiresAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const idemStore = new Map<string, IdemEntry<any>>();

export function getIdempotentResult<T>(key: string): T | undefined {
  const entry = idemStore.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    idemStore.delete(key);
    return undefined;
  }
  return entry.result as T;
}

export function setIdempotentResult<T>(
  key: string,
  result: T,
  ttlMs = 24 * 60 * 60 * 1000, // 24 h default
): void {
  idemStore.set(key, { result, expiresAt: Date.now() + ttlMs });
}
