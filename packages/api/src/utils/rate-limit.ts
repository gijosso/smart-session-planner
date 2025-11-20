import { RATE_LIMIT } from "../constants/rate-limit";
import { logger } from "./logger";

/**
 * In-memory rate limit store
 * In production, consider using Redis for distributed rate limiting
 */
const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number; burstCount: number; burstResetAt: number }
>();

/**
 * Clean up expired entries periodically (every 5 minutes)
 */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now && value.burstResetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

/**
 * Check if a user has exceeded rate limits
 * @param userId - User ID to check rate limit for
 * @returns true if rate limit is exceeded, false otherwise
 */
export function checkRateLimit(userId: string): {
  exceeded: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit) {
    // First request - initialize
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT.WINDOW_MS,
      burstCount: 1,
      burstResetAt: now + RATE_LIMIT.BURST_WINDOW_MS,
    });
    return {
      exceeded: false,
      remaining: RATE_LIMIT.MAX_MUTATIONS_PER_WINDOW - 1,
      resetAt: now + RATE_LIMIT.WINDOW_MS,
    };
  }

  // Reset counters if windows have expired
  if (userLimit.resetAt < now) {
    userLimit.count = 0;
    userLimit.resetAt = now + RATE_LIMIT.WINDOW_MS;
  }
  if (userLimit.burstResetAt < now) {
    userLimit.burstCount = 0;
    userLimit.burstResetAt = now + RATE_LIMIT.BURST_WINDOW_MS;
  }

  // Check burst limit (per minute)
  if (userLimit.burstCount >= RATE_LIMIT.MAX_MUTATIONS_PER_MINUTE) {
    logger.warn("Rate limit exceeded (burst)", {
      userId,
      burstCount: userLimit.burstCount,
      resetAt: userLimit.burstResetAt,
    });
    return {
      exceeded: true,
      remaining: 0,
      resetAt: userLimit.burstResetAt,
    };
  }

  // Check window limit (per 15 minutes)
  if (userLimit.count >= RATE_LIMIT.MAX_MUTATIONS_PER_WINDOW) {
    logger.warn("Rate limit exceeded (window)", {
      userId,
      count: userLimit.count,
      resetAt: userLimit.resetAt,
    });
    return {
      exceeded: true,
      remaining: 0,
      resetAt: userLimit.resetAt,
    };
  }

  // Increment counters
  userLimit.count++;
  userLimit.burstCount++;

  return {
    exceeded: false,
    remaining: RATE_LIMIT.MAX_MUTATIONS_PER_WINDOW - userLimit.count,
    resetAt: userLimit.resetAt,
  };
}
