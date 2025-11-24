import type { Ionicons } from "@expo/vector-icons";

import type { SessionType } from "@ssp/api/client";

export const SESSION_TYPES_DISPLAY = {
  DEEP_WORK: {
    label: "Deep Work",
    value: "DEEP_WORK",
    icon: "book-outline",
    iconColor: "#59168B",
    color: "#AD46FF", // Deep Purple
    backgroundColor: "#E9D4FF",
  },
  WORKOUT: {
    label: "Workout",
    value: "WORKOUT",
    icon: "barbell-outline",
    iconColor: "#0D542B",
    color: "#00C950", // Emerald Green
    backgroundColor: "#B9F8CF",
  },
  LANGUAGE: {
    label: "Language",
    value: "LANGUAGE",
    icon: "language-outline",
    iconColor: "#003366",
    color: "#2B7FFF", // Sky Blue
    backgroundColor: "#B3E5FC",
  },
  MEDITATION: {
    label: "Meditation",
    value: "MEDITATION",
    icon: "person-outline",
    iconColor: "#FF9900",
    color: "#FF9900", // Golden Orange
    backgroundColor: "#FFE6B3",
  },
  CLIENT_MEETING: {
    label: "Client Meeting",
    value: "CLIENT_MEETING",
    icon: "people-outline",
    iconColor: "#101828",
    color: "#101828", // Slate Gray
    backgroundColor: "#E5E7EB",
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
    iconColor: "#FF66B3",
    color: "#FF66B3", // Magenta
    backgroundColor: "#FFE6F2",
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
