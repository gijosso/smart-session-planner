import { authRouter } from "./router/auth";
import { availabilityRouter } from "./router/availability";
import { sessionRouter } from "./router/session";
import { statsRouter } from "./router/stats";
import { createTRPCRouter } from "./trpc";

// Explicitly type to avoid portability issues with inferred types
// Using ReturnType to get the router type without referencing internal tRPC types
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

// export type definition of API
export type AppRouter = typeof appRouter;
export { appRouter };
