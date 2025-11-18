import { authRouter } from "./router/auth";
import { availabilityRouter } from "./router/availability";
import { sessionRouter } from "./router/session";
import { createTRPCRouter } from "./trpc";

// Explicitly type to avoid portability issues with inferred types
// Using ReturnType to get the router type without referencing internal tRPC types
const appRouter: ReturnType<
  typeof createTRPCRouter<{
    auth: typeof authRouter;
    availability: typeof availabilityRouter;
    session: typeof sessionRouter;
  }>
> = createTRPCRouter({
  auth: authRouter,
  availability: availabilityRouter,
  session: sessionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export { appRouter };
