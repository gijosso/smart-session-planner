import type { Ionicons } from "@expo/vector-icons";

import type { SessionType } from "@ssp/api/client";

export const SESSION_TYPES_DISPLAY = {
  DEEP_WORK: {
    label: "Deep Work",
    value: "DEEP_WORK",
    icon: "book-outline",
    iconColor: "#8B5CF6",
    color: "#8B5CF6", // Purple
  },
  WORKOUT: {
    label: "Workout",
    value: "WORKOUT",
    icon: "barbell-outline",
    iconColor: "#10B981",
    color: "#10B981", // Green
  },
  LANGUAGE: {
    label: "Language",
    value: "LANGUAGE",
    icon: "language-outline",
    iconColor: "#3B82F6",
    color: "#3B82F6", // Blue
  },
  MEDITATION: {
    label: "Meditation",
    value: "MEDITATION",
    icon: "person-outline",
    iconColor: "#F59E0B",
    color: "#F59E0B", // Amber
  },
  CLIENT_MEETING: {
    label: "Client Meeting",
    value: "CLIENT_MEETING",
    icon: "people-outline",
    iconColor: "#EF4444",
    color: "#EF4444", // Red
  },
  STUDY: {
    label: "Study",
    value: "STUDY",
    icon: "book-outline",
    iconColor: "#6366F1",
    color: "#6366F1", // Indigo
  },
  READING: {
    label: "Reading",
    value: "READING",
    icon: "book-outline",
    iconColor: "#EC4899",
    color: "#EC4899", // Pink
  },
  OTHER: {
    label: "Other",
    value: "OTHER",
    icon: "book-outline",
    iconColor: "#6B7280",
    color: "#6B7280", // Gray
  },
} satisfies Record<
  SessionType,
  {
    label: string;
    value: SessionType;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
  }
>;
