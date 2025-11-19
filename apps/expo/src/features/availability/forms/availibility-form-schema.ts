import { z } from "zod";

import { DAYS_OF_WEEK } from "@ssp/api/client";

export const availabilityFormSchema = z
  .object({
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:mm format"),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "End time must be in HH:mm format"),
  })
  .refine(
    (data) => {
      const [startHours, startMinutes] = data.startTime.split(":").map(Number);
      const [endHours, endMinutes] = data.endTime.split(":").map(Number);
      const startTotal = (startHours ?? 0) * 60 + (startMinutes ?? 0);
      const endTotal = (endHours ?? 0) * 60 + (endMinutes ?? 0);
      return endTotal > startTotal;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );
