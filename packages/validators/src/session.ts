import { z } from "zod/v4";

import { CreateSessionSchema, SESSION_TYPES } from "@ssp/db/schema";
import { SESSION_LIMITS, SUGGESTION_INPUT_LIMITS } from "./constants";

/**
 * Form schema for creating a session
 * This validates the form inputs before they're combined into Date objects
 */
export const sessionFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(256, "Title must be 256 characters or less"),
    type: z.enum(SESSION_TYPES, {
      message: "Please select a valid session type",
    }),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:mm format"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "End time must be in HH:mm format"),
    priority: z.coerce.number().int().min(1).max(5),
    description: z.string().optional(),
  })
  .refine(
    (data: {
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
    }) => {
      const startDateTime = `${data.startDate}T${data.startTime}:00`;
      const startDate = new Date(startDateTime);
      return !isNaN(startDate.getTime());
    },
    {
      message: "Invalid start date/time",
      path: ["startTime"],
    },
  )
  .refine(
    (data: {
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
    }) => {
      const endDateTime = `${data.endDate}T${data.endTime}:00`;
      const endDate = new Date(endDateTime);
      return !isNaN(endDate.getTime());
    },
    {
      message: "Invalid end date/time",
      path: ["endTime"],
    },
  )
  .refine(
    (data: {
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
    }) => {
      const startDateTime = `${data.startDate}T${data.startTime}:00`;
      const endDateTime = `${data.endDate}T${data.endTime}:00`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);
      return endDate > startDate;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

export type SessionFormValues = z.infer<typeof sessionFormSchema>;


/**
 * Session ID input schema
 */
export const sessionIdInputSchema = z.object({ id: z.string() });

/**
 * Create session input schema (extends CreateSessionSchema with allowConflicts)
 */
export const createSessionInputSchema = CreateSessionSchema.extend({
  allowConflicts: z.boolean().optional().default(false),
}).refine((data: { endTime: Date; startTime: Date }) => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

/**
 * Update session input schema
 */
export const updateSessionInputSchema = z
  .object({
    id: z.string(),
    title: z.string().max(SESSION_LIMITS.MAX_TITLE_LENGTH).optional(),
    type: z.enum(SESSION_TYPES).optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    completed: z.boolean().optional(),
    priority: z.coerce
      .number()
      .int()
      .min(SESSION_LIMITS.MIN_PRIORITY)
      .max(SESSION_LIMITS.MAX_PRIORITY)
      .optional(),
    description: z.string().optional(),
    allowConflicts: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // Validate that at least one field is being updated
      const hasUpdates =
        data.title !== undefined ||
        data.type !== undefined ||
        data.startTime !== undefined ||
        data.endTime !== undefined ||
        data.completed !== undefined ||
        data.priority !== undefined ||
        data.description !== undefined;
      return hasUpdates;
    },
    {
      message: "At least one field must be provided for update",
      path: ["id"],
    },
  )
  .refine(
    (data) => {
      // If both startTime and endTime are provided, validate the range
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

/**
 * Check conflicts input schema
 */
export const checkConflictsInputSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    excludeSessionId: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

/**
 * Suggest time slots input schema
 */
export const suggestTimeSlotsInputSchema = z.object({
  startDate: z.coerce.date().optional(),
  lookAheadDays: z
    .number()
    .int()
    .min(SUGGESTION_INPUT_LIMITS.MIN_LOOKAHEAD_DAYS)
    .max(SUGGESTION_INPUT_LIMITS.MAX_LOOKAHEAD_DAYS)
    .optional()
    .default(SUGGESTION_INPUT_LIMITS.DEFAULT_LOOKAHEAD_DAYS),
  preferredTypes: z.array(z.enum(SESSION_TYPES)).optional(),
  minPriority: z
    .number()
    .int()
    .min(SUGGESTION_INPUT_LIMITS.MIN_PRIORITY)
    .max(SUGGESTION_INPUT_LIMITS.MAX_PRIORITY)
    .optional(),
  maxPriority: z
    .number()
    .int()
    .min(SUGGESTION_INPUT_LIMITS.MIN_PRIORITY)
    .max(SUGGESTION_INPUT_LIMITS.MAX_PRIORITY)
    .optional(),
});

/**
 * Accept suggestion input schema
 */
export const acceptSuggestionInputSchema = z
  .object({
    suggestionId: z.string(), // ID for tracking which suggestion was accepted
    title: z.string().max(SESSION_LIMITS.MAX_TITLE_LENGTH),
    type: z.enum(SESSION_TYPES),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    priority: z.coerce
      .number()
      .int()
      .min(SESSION_LIMITS.MIN_PRIORITY)
      .max(SESSION_LIMITS.MAX_PRIORITY),
    description: z.string().optional(),
    allowConflicts: z.boolean().optional().default(false),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

