import { AsyncLocalStorage } from "async_hooks";

/**
 * Request context stored in AsyncLocalStorage
 * Allows access to request context from anywhere in the async call chain
 */
interface RequestContext {
  requestId: string;
}

/**
 * AsyncLocalStorage instance for request context
 * This allows request context to be accessed from any async function
 * without explicitly passing it through function parameters
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Run a function with request context
 * This should be called at the entry point (e.g., in createTRPCContext)
 * Supports both sync and async functions
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T,
): T;
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => Promise<T>,
): Promise<T>;
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return requestContextStorage.run(context, fn);
}

/**
 * Get current request context
 * Returns undefined if called outside of a request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Get current request ID from AsyncLocalStorage context
 * Returns undefined if called outside of a request context
 */
export function getRequestIdFromContext(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}
