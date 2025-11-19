import type { DayOfWeek } from "@ssp/api/client";

export const DAYS_OF_WEEK_DISPLAY = {
  SUNDAY: { label: "Sunday", value: "SUNDAY" },
  MONDAY: { label: "Monday", value: "MONDAY" },
  TUESDAY: { label: "Tuesday", value: "TUESDAY" },
  WEDNESDAY: { label: "Wednesday", value: "WEDNESDAY" },
  THURSDAY: { label: "Thursday", value: "THURSDAY" },
  FRIDAY: { label: "Friday", value: "FRIDAY" },
  SATURDAY: { label: "Saturday", value: "SATURDAY" },
} satisfies Record<DayOfWeek, { label: string; value: DayOfWeek }>;
