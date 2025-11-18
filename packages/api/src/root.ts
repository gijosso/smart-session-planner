import { authRouter } from "./router/auth";
import { sessionRouter } from "./router/session";
import { createTRPCRouter } from "./trpc";

// Explicitly type to avoid portability issues with inferred types
// Using ReturnType to get the router type without referencing internal tRPC types
const appRouter: ReturnType<
  typeof createTRPCRouter<{
    auth: typeof authRouter;
    session: typeof sessionRouter;
  }>
> = createTRPCRouter({
  auth: authRouter,
  session: sessionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export { appRouter };
