/**
 * Constants for authentication
 */

/**
 * Password requirements
 */
export const PASSWORD = {
  /** Minimum password length */
  MIN_LENGTH: 6,
} as const;

/**
 * Timezone field limits
 */
export const TIMEZONE = {
  /** Maximum length for timezone string (IANA timezone) */
  MAX_LENGTH: 50,
} as const;

/**
 * Anonymous user configuration
 */
export const ANONYMOUS_USER = {
  /** Number of random bytes for anonymous email generation */
  EMAIL_RANDOM_BYTES: 8,
  /** Number of random bytes for anonymous password generation */
  PASSWORD_RANDOM_BYTES: 32,
  /** Domain suffix for anonymous emails */
  EMAIL_DOMAIN: "@anonymous.local",
  /** Email prefix for anonymous users */
  EMAIL_PREFIX: "anonymous_",
} as const;

