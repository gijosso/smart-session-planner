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
    iconColor: "#E66B00",
    color: "#FF9800", // Orange
    backgroundColor: "#FFE0B2",
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
    iconColor: "#184E77",
    color: "#38BDF8", // Light Blue
    backgroundColor: "#E0F2FE",
  },
  READING: {
    label: "Reading",
    value: "READING",
    icon: "library-outline",
    iconColor: "#3B3B3B",
    color: "#FFB300", // Amber
    backgroundColor: "#FFF7E0",
  },
  OTHER: {
    label: "Other",
    value: "OTHER",
    icon: "help-circle-outline",
    iconColor: "#607D8B",
    color: "#9E9E9E", // Gray
    backgroundColor: "#ECEFF1",
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
