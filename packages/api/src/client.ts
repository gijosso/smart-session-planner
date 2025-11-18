/**
 * Client-safe exports for frontend applications
 * This file only exports types and constants that are safe to use in client bundles
 * It does NOT export any server-side code (routers, context, etc.)
 */

// Re-export session types for frontend use
export { SESSION_TYPES } from "@ssp/db/schema";
export type { SessionType } from "@ssp/db/schema";

export { DAYS_OF_WEEK } from "@ssp/db/schema";
export type { DayOfWeek } from "@ssp/db/schema";
