import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";

/**
 * Inference helpers for input types
 */
type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 */
type RouterOutputs = inferRouterOutputs<AppRouter>;

// Server-only exports (should not be imported in client apps)
export { type AppRouter, appRouter } from "./root";
export { createTRPCContext } from "./trpc";

// Client-safe type exports (safe to import in frontend apps)
// Note: For runtime values like SESSION_TYPES, import from "@ssp/api/client" instead
export type { RouterInputs, RouterOutputs };

// Date utilities (server-side only - uses Node.js APIs)
export * from "./utils/date";
