/**
 * Simple in-memory rate limiter
 *
 * WARNING: This is a basic in-memory rate limiter suitable for development and single-instance deployments.
 *
 * PRODUCTION LIMITATIONS:
 * - Does NOT work across multiple server instances (no shared state)
 * - Memory usage grows with number of unique clients
 * - Resets on server restart (no persistence)
 * - IP-based identification is unreliable (proxies, NAT, shared IPs)
 *
 * For production with multiple instances, use Redis or a dedicated rate limiting service.
 * Recommended: Upstash Redis, Vercel KV, or Cloudflare Rate Limiting.
 */

import { TRPCError } from "@trpc/server";

import { RATE_LIMIT_CONSTANTS } from "./constants";
import { logger } from "./logger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Get client identifier from request context
 * Returns a unique identifier for rate limiting purposes
 *
 * Returns client identifier (IP address or "unknown" for shared rate limiting)
 */
function getClientId(headers: Headers): { id: string; isUnknown: boolean } {
  // Try to get IP from various headers (in order of preference)
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return { id: firstIp, isUnknown: false };
    }
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return { id: realIp, isUnknown: false };
  }

  // If no IP headers are available, use shared "unknown" key with stricter limits
  // In production, you should ensure your reverse proxy sets x-forwarded-for or x-real-ip
  logger.warn(
    "No IP header found, using shared rate limit for unknown clients",
  );
  return { id: "unknown", isUnknown: true };
}

/**
 * Check if request should be rate limited
 * Includes automatic cleanup if store grows too large
 */
function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): void {
  // Force cleanup if store is too large
  if (rateLimitStore.size > RATE_LIMIT_CONSTANTS.MAX_STORE_SIZE) {
    logger.warn("Rate limit store exceeded max size, forcing cleanup", {
      storeSize: rateLimitStore.size,
      maxSize: RATE_LIMIT_CONSTANTS.MAX_STORE_SIZE,
    });
    cleanupRateLimitStore();
  }

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // Create new entry or reset expired entry
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  // Increment count
  entry.count += 1;

  if (entry.count > maxAttempts) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    });
  }
}

/**
 * Rate limit middleware for sign-up attempts
 */
export function rateLimitSignUp(headers: Headers): void {
  const { id: clientId, isUnknown } = getClientId(headers);
  const key = `signup:${clientId}`;
  const maxAttempts = isUnknown
    ? RATE_LIMIT_CONSTANTS.MAX_UNKNOWN_CLIENT_ATTEMPTS
    : RATE_LIMIT_CONSTANTS.MAX_SIGNUP_ATTEMPTS;
  checkRateLimit(key, maxAttempts, RATE_LIMIT_CONSTANTS.RATE_LIMIT_WINDOW_MS);
}

/**
 * Rate limit middleware for sign-in attempts
 */
export function rateLimitSignIn(headers: Headers): void {
  const { id: clientId, isUnknown } = getClientId(headers);
  const key = `signin:${clientId}`;
  const maxAttempts = isUnknown
    ? RATE_LIMIT_CONSTANTS.MAX_UNKNOWN_CLIENT_ATTEMPTS
    : RATE_LIMIT_CONSTANTS.MAX_SIGNIN_ATTEMPTS;
  checkRateLimit(key, maxAttempts, RATE_LIMIT_CONSTANTS.RATE_LIMIT_WINDOW_MS);
}

/**
 * Rate limit middleware for mutations (create, update, delete)
 */
export function rateLimitMutations(headers: Headers): void {
  const { id: clientId, isUnknown } = getClientId(headers);
  const key = `mutations:${clientId}`;
  const maxAttempts = isUnknown
    ? RATE_LIMIT_CONSTANTS.MAX_UNKNOWN_CLIENT_ATTEMPTS
    : RATE_LIMIT_CONSTANTS.MAX_MUTATION_ATTEMPTS;
  checkRateLimit(key, maxAttempts, RATE_LIMIT_CONSTANTS.RATE_LIMIT_WINDOW_MS);
}

/**
 * Rate limit middleware for token refresh
 */
export function rateLimitRefreshToken(headers: Headers): void {
  const { id: clientId, isUnknown } = getClientId(headers);
  const key = `refresh:${clientId}`;
  const maxAttempts = isUnknown
    ? RATE_LIMIT_CONSTANTS.MAX_UNKNOWN_CLIENT_ATTEMPTS
    : RATE_LIMIT_CONSTANTS.MAX_SIGNIN_ATTEMPTS;
  checkRateLimit(key, maxAttempts, RATE_LIMIT_CONSTANTS.RATE_LIMIT_WINDOW_MS);
}

/**
 * Clean up expired rate limit entries (call periodically)
 * Improved: Limits cleanup to prevent blocking on large stores
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  let deletedCount = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
      deletedCount++;
      // Prevent blocking on very large stores
      if (deletedCount >= RATE_LIMIT_CONSTANTS.MAX_CLEANUP_PER_CALL) {
        break;
      }
    }
  }

  if (deletedCount > 0) {
    logger.debug("Cleaned up expired rate limit entries", {
      deletedCount,
      remainingSize: rateLimitStore.size,
    });
  }
}

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, RATE_LIMIT_CONSTANTS.CLEANUP_INTERVAL_MS);
}
