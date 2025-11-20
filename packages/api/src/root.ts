import { authRouter } from "./router/auth";
import { availabilityRouter } from "./router/availability";
import { sessionRouter } from "./router/session";
import { statsRouter } from "./router/stats";
import { createTRPCRouter } from "./trpc";

/**
 * Main application router combining all sub-routers
 * This is the root of the tRPC API
 */
const appRouter: ReturnType<
  typeof createTRPCRouter<{
    auth: typeof authRouter;
    availability: typeof availabilityRouter;
    session: typeof sessionRouter;
    stats: typeof statsRouter;
  }>
> = createTRPCRouter({
  auth: authRouter,
  availability: availabilityRouter,
  session: sessionRouter,
  stats: statsRouter,
});

// Export type definition of API for client-side type inference
export type AppRouter = typeof appRouter;
export { appRouter };
