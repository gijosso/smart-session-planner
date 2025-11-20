import { TRPCError } from "@trpc/server";

import { REQUEST_CONSTANTS } from "./constants";

/**
 * Middleware to enforce request size limits
 * Prevents DoS attacks via large payloads
 *
 * For mutations, content-length header is required.
 * For queries, content-length may not be set (acceptable for GET requests).
 *
 * Throws TRPCError if content-length is missing for mutations or exceeds limit
 */
export function validateRequestSize(
  contentLength: string | null,
  isMutation = true,
): void {
  // Mutations MUST have content-length header
  if (isMutation && !contentLength) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Content-Length header is required for mutations",
    });
  }

  // If content-length is not provided for queries, skip validation
  if (!contentLength) {
    return;
  }

  const size = Number.parseInt(contentLength, 10);
  if (Number.isNaN(size) || size < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid Content-Length header format",
    });
  }

  if (size > REQUEST_CONSTANTS.MAX_REQUEST_SIZE_BYTES) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: `Request body exceeds maximum size of ${REQUEST_CONSTANTS.MAX_REQUEST_SIZE_BYTES / 1024}KB`,
    });
  }
}
