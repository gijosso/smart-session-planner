import { z } from "zod/v4";

import { TIMEZONE } from "./constants";

/**
 * Sign up anonymously input schema
 */
export const signUpAnonymouslyInputSchema = z
  .object({
    timezone: z.string().max(TIMEZONE.MAX_LENGTH).optional(), // IANA timezone string (e.g., "America/New_York")
  })
  .optional();

/**
 * Refresh token input schema
 */
export const refreshTokenInputSchema = z.object({
  refreshToken: z.string(),
});

