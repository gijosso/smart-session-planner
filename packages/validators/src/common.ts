import { z } from "zod/v4";

/**
 * Pagination input schema
 */
export const paginationInputSchema = z
  .object({
    limit: z.number().int().min(1).max(1000).optional().default(100),
    offset: z.number().int().min(0).optional().default(0),
  })
  .optional();

