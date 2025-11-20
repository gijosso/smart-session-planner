import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";

/**
 * Inference helpers for input types
 * These types can be safely imported in client applications
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * These types can be safely imported in client applications
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// ============================================================================
// SERVER-ONLY EXPORTS
// These should NOT be imported in client applications
// ============================================================================

/**
 * Main application router (server-only)
 */
export { type AppRouter, appRouter } from "./root";

/**
 * tRPC context creator (server-only)
 */
export { createTRPCContext } from "./trpc";

// ============================================================================
// CLIENT-SAFE EXPORTS
// These can be safely imported in frontend applications
// ============================================================================

/**
 * Date utility functions
 * Note: These use Node.js APIs and should only be used server-side
 * For client-side date handling, use a library like date-fns
 */
export * from "./utils/date";
