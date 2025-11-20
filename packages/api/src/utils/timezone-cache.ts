import { TIMEZONE_CACHE } from "../constants/trpc";
import { logger } from "./logger";

/**
 * In-memory cache for timezone lookups
 * Key: userId, Value: { timezone: string, cachedAt: number }
 */
const timezoneCache = new Map<string, { timezone: string; cachedAt: number }>();

/**
 * Clean up expired cache entries periodically (every 5 minutes)
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of timezoneCache.entries()) {
    if (now - value.cachedAt > TIMEZONE_CACHE.TTL_MS) {
      timezoneCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired timezone cache entries`);
  }
}, TIMEZONE_CACHE.TTL_MS);

/**
 * Get cached timezone for a user
 */
export function getCachedTimezone(userId: string): string | null {
  const cached = timezoneCache.get(userId);
  if (!cached) {
    return null;
  }

  const now = Date.now();
  if (now - cached.cachedAt > TIMEZONE_CACHE.TTL_MS) {
    // Expired, remove from cache
    timezoneCache.delete(userId);
    return null;
  }

  return cached.timezone;
}

/**
 * Cache timezone for a user
 */
export function setCachedTimezone(userId: string, timezone: string): void {
  timezoneCache.set(userId, {
    timezone,
    cachedAt: Date.now(),
  });
}

/**
 * Clear cached timezone for a user (useful when timezone is updated)
 */
export function clearCachedTimezone(userId: string): void {
  timezoneCache.delete(userId);
}

/**
 * Clear all cached timezones (useful for testing or cache invalidation)
 */
export function clearAllCachedTimezones(): void {
  timezoneCache.clear();
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getCacheStats(): {
  size: number;
  maxAge: number;
} {
  const now = Date.now();
  let maxAge = 0;
  for (const value of timezoneCache.values()) {
    const age = now - value.cachedAt;
    if (age > maxAge) {
      maxAge = age;
    }
  }
  return {
    size: timezoneCache.size,
    maxAge,
  };
}
