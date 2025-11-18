import type { DayOfWeek } from "@ssp/api/client";

export const DAYS_OF_WEEK_DISPLAY = {
  sunday: { label: "Sunday", value: "sunday" },
  monday: { label: "Monday", value: "monday" },
  tuesday: { label: "Tuesday", value: "tuesday" },
  wednesday: { label: "Wednesday", value: "wednesday" },
  thursday: { label: "Thursday", value: "thursday" },
  friday: { label: "Friday", value: "friday" },
  saturday: { label: "Saturday", value: "saturday" },
} satisfies Record<DayOfWeek, { label: string; value: DayOfWeek }>;
