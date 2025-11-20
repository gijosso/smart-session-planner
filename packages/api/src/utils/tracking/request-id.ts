import { randomBytes } from "crypto";

/**
 * Generate a unique request ID for tracing requests across services
 * Uses cryptographically secure random bytes for uniqueness
 * Optimized: Uses 8 bytes (16 hex chars) instead of 16 bytes for better performance
 * while maintaining sufficient uniqueness (2^64 possible values)
 */
export function generateRequestId(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Extract request ID from headers or generate a new one
 * Checks for common request ID headers (x-request-id, x-correlation-id)
 * Falls back to generating a new ID if not present
 */
export function extractRequestIdFromHeaders(headers: Headers): string {
  // Check common request ID headers (in order of preference)
  const requestId =
    headers.get("x-request-id") ??
    headers.get("x-correlation-id") ??
    headers.get("x-trace-id");

  if (requestId && requestId.length > 0 && requestId.length < 200) {
    // Validate and sanitize request ID (prevent header injection)
    // Stricter validation: only allow alphanumeric, hyphens, and underscores
    // Limit length to prevent DoS
    const sanitized = requestId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
    // Only return if sanitized ID is still valid (not empty, reasonable length)
    if (sanitized.length >= 1 && sanitized.length <= 100) {
      return sanitized;
    }
  }

  // Generate new request ID if not provided
  return generateRequestId();
}
