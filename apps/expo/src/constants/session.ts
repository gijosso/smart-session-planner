import type { SessionType } from "@ssp/api/client";

export const SESSION_TYPES_DISPLAY = {
  DEEP_WORK: { label: "Deep Work", value: "DEEP_WORK" },
  WORKOUT: { label: "Workout", value: "WORKOUT" },
  LANGUAGE: { label: "Language", value: "LANGUAGE" },
  MEDITATION: { label: "Meditation", value: "MEDITATION" },
  CLIENT_MEETING: { label: "Client Meeting", value: "CLIENT_MEETING" },
  STUDY: { label: "Study", value: "STUDY" },
  READING: { label: "Reading", value: "READING" },
  OTHER: { label: "Other", value: "OTHER" },
} satisfies Record<SessionType, { label: string; value: SessionType }>;
