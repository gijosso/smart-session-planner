/**
 * Validators package - Shared validation schemas for frontend and backend
 */

// Constants
export {
  SESSION_LIMITS,
  SUGGESTION_INPUT_LIMITS,
  TIMEZONE,
} from "./constants";

// Session validators
export {
  sessionFormSchema,
  sessionIdInputSchema,
  createSessionInputSchema,
  updateSessionInputSchema,
  checkConflictsInputSchema,
  suggestTimeSlotsInputSchema,
  acceptSuggestionInputSchema,
  type SessionFormValues,
} from "./session";

// Availability validators
export { availabilityFormSchema } from "./availability";

// Auth validators
export {
  signUpAnonymouslyInputSchema,
  refreshTokenInputSchema,
} from "./auth";

// Common validators
export { paginationInputSchema } from "./common";
