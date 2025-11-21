import type { Ionicons } from "@expo/vector-icons";

import type { SessionType } from "@ssp/api/client";

export const SESSION_TYPES_DISPLAY = {
  DEEP_WORK: {
    label: "Deep Work",
    value: "DEEP_WORK",
    icon: "book-outline",
    iconColor: "#8B5CF6",
    color: "#8B5CF6", // Purple
    backgroundColor: "#F5F3FF",
  },
  WORKOUT: {
    label: "Workout",
    value: "WORKOUT",
    icon: "barbell-outline",
    iconColor: "#10B981",
    color: "#10B981", // Green
    backgroundColor: "#DCFCE7",
  },
  LANGUAGE: {
    label: "Language",
    value: "LANGUAGE",
    icon: "language-outline",
    iconColor: "#3B82F6",
    color: "#3B82F6", // Blue
    backgroundColor: "#EFF6FF",
  },
  MEDITATION: {
    label: "Meditation",
    value: "MEDITATION",
    icon: "person-outline",
    iconColor: "#F59E0B",
    color: "#F59E0B", // Amber
    backgroundColor: "#FFFBEB",
  },
  CLIENT_MEETING: {
    label: "Client Meeting",
    value: "CLIENT_MEETING",
    icon: "people-outline",
    iconColor: "#EF4444",
    color: "#EF4444", // Red
    backgroundColor: "#FEF2F2",
  },
  STUDY: {
    label: "Study",
    value: "STUDY",
    icon: "book-outline",
    iconColor: "#6366F1",
    color: "#6366F1", // Indigo
    backgroundColor: "#EFF6FF",
  },
  READING: {
    label: "Reading",
    value: "READING",
    icon: "book-outline",
    iconColor: "#EC4899",
    color: "#EC4899", // Pink
    backgroundColor: "#FDF2F8",
  },
  OTHER: {
    label: "Other",
    value: "OTHER",
    icon: "book-outline",
    iconColor: "#6B7280",
    color: "#6B7280", // Gray
    backgroundColor: "#F3F4F6",
  },
} satisfies Record<
  SessionType,
  {
    label: string;
    value: SessionType;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    backgroundColor: string;
  }
>;
