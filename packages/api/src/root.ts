import { authRouter } from "./router/auth";
import { postRouter } from "./router/post";
import { createTRPCRouter } from "./trpc";

// Explicitly type to avoid portability issues with inferred types
// Using ReturnType to get the router type without referencing internal tRPC types
const appRouter: ReturnType<
  typeof createTRPCRouter<{
    auth: typeof authRouter;
    post: typeof postRouter;
  }>
> = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export { appRouter };
