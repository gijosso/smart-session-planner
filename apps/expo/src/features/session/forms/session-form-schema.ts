import { z } from "zod";

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
    type: z
      .string()
      .min(1, "Type is required")
      .max(100, "Type must be 100 characters or less"),
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
