/**
 * Safe JSON utilities that handle errors gracefully
 */

/**
 * Safely stringify an object, handling circular references and other errors
 * Falls back to a string representation if JSON.stringify fails
 */
export function safeStringify(
  value: unknown,
  space?: string | number,
): string {
  try {
    return JSON.stringify(value, null, space);
  } catch (error) {
    // Handle circular references and other JSON.stringify errors
    if (error instanceof Error) {
      if (error.message.includes("circular") || error.name === "TypeError") {
        return "[Circular or non-serializable object]";
      }
    }

    // Fallback to string representation
    try {
      return String(value);
    } catch {
      return "[Unable to stringify value]";
    }
  }
}

/**
 * Safely parse JSON, handling errors gracefully
 * Returns null if parsing fails
 */
export function safeParse<T = unknown>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

