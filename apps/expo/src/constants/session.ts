import type { SessionType } from "@ssp/api/client";

export const SESSION_TYPES_DISPLAY = {
  DEEP_WORK: {
    label: "Deep Work",
    value: "DEEP_WORK",
    color: "#8B5CF6", // Purple
  },
  WORKOUT: {
    label: "Workout",
    value: "WORKOUT",
    color: "#10B981", // Green
  },
  LANGUAGE: {
    label: "Language",
    value: "LANGUAGE",
    color: "#3B82F6", // Blue
  },
  MEDITATION: {
    label: "Meditation",
    value: "MEDITATION",
    color: "#F59E0B", // Amber
  },
  CLIENT_MEETING: {
    label: "Client Meeting",
    value: "CLIENT_MEETING",
    color: "#EF4444", // Red
  },
  STUDY: {
    label: "Study",
    value: "STUDY",
    color: "#6366F1", // Indigo
  },
  READING: {
    label: "Reading",
    value: "READING",
    color: "#EC4899", // Pink
  },
  OTHER: {
    label: "Other",
    value: "OTHER",
    color: "#6B7280", // Gray
  },
} satisfies Record<
  SessionType,
  { label: string; value: SessionType; color: string }
>;
