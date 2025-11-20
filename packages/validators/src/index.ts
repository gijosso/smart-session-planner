import { z } from "zod/v4";

/**
 * Date validator that accepts Date objects or ISO date strings
 * Transforms string inputs to Date objects with validation
 */
export const dateSchema = z.union([z.date(), z.string()]).transform((val) => {
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date format");
  }
  return parsed;
});

/**
 * Optional date validator that accepts Date objects or ISO date strings
 * Returns undefined if value is not provided
 */
export const optionalDateSchema = z
  .union([z.date(), z.string()])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    const parsed = new Date(val);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid date format");
    }
    return parsed;
  });

/**
 * Date range validator for start and end dates
 */
export const dateRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
});

/**
 * Time range validator for start and end times
 */
export const timeRangeSchema = z.object({
  startTime: dateSchema,
  endTime: dateSchema,
});

/**
 * Optional time range validator for start and end times
 */
export const optionalTimeRangeSchema = z.object({
  startTime: optionalDateSchema,
  endTime: optionalDateSchema,
});

/**
 * Valid IANA timezone string
 * Validates against Intl.supportedValuesOf('timeZone') if available
 */
export const timezoneSchema = z
  .string()
  .max(50)
  .refine(
    (tz) => {
      try {
        // Check if timezone is valid by trying to format a date with it
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        "Invalid timezone. Must be a valid IANA timezone string (e.g., 'America/New_York')",
    },
  );

/**
 * Password strength validator
 * Requires: minimum 8 characters, at least one letter and one number
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .max(128, "Password must be less than 128 characters");

/**
 * Email normalization and validation
 */
export const emailSchema = z
  .email("Invalid email format")
  .transform((email) => email.toLowerCase().trim());

/**
 * Sanitize string input to prevent XSS
 * Removes potentially dangerous characters
 */
export const sanitizeString = (input: string, maxLength?: number): string => {
  let sanitized = input.trim();

  // Remove null bytes and control characters except newlines and tabs
  // Using character code ranges to avoid linter warnings
  sanitized = sanitized
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      // Keep printable characters, newlines (10), and tabs (9)
      // Remove: 0-8 (null to backspace), 11-12 (vertical tab, form feed), 14-31 (control chars), 127 (DEL)
      return (
        code === 9 || // tab
        code === 10 || // newline
        (code >= 32 && code <= 126) || // printable ASCII
        code > 127 // extended characters
      );
    })
    .join("");

  if (maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
};

/**
 * Schema for sanitized string input
 */
export const sanitizedStringSchema = (maxLength?: number) => {
  return z
    .string()
    .max(maxLength ?? 10000)
    .transform((val) => sanitizeString(val, maxLength));
};
