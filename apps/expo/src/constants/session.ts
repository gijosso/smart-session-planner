import type { Ionicons } from "@expo/vector-icons";

import type { SessionType } from "@ssp/api/client";

/**
 * Session type display configuration
 * Colors are defined in theme.css as CSS variables and can be used via Tailwind classes:
 * - Main color: bg-session-{type}, text-session-{type}, border-session-{type}
 * - Background color: bg-session-{type}-bg
 *
 * For inline styles (e.g., Ionicons), use getSessionTypeColor() helper
 */
export const SESSION_TYPES_DISPLAY = {
  DEEP_WORK: {
    label: "Deep Work",
    value: "DEEP_WORK",
    icon: "book-outline",
    colorClass: "session-deep-work",
    bgClass: "session-deep-work-bg",
    // Fallback hex colors for components that need actual color values (e.g., Ionicons)
    // These match the theme.css oklch values converted to hex
    iconColor: "#8B5CF6", // oklch(0.65 0.2 280)
    color: "#8B5CF6",
    backgroundColor: "#F5F3FF", // oklch(0.97 0.02 280)
  },
  WORKOUT: {
    label: "Workout",
    value: "WORKOUT",
    icon: "barbell-outline",
    colorClass: "session-workout",
    bgClass: "session-workout-bg",
    iconColor: "#10B981", // oklch(0.65 0.15 160)
    color: "#10B981",
    backgroundColor: "#DCFCE7", // oklch(0.95 0.03 160)
  },
  LANGUAGE: {
    label: "Language",
    value: "LANGUAGE",
    icon: "language-outline",
    colorClass: "session-language",
    bgClass: "session-language-bg",
    iconColor: "#3B82F6", // oklch(0.6 0.2 250)
    color: "#3B82F6",
    backgroundColor: "#EFF6FF", // oklch(0.97 0.02 250)
  },
  MEDITATION: {
    label: "Meditation",
    value: "MEDITATION",
    icon: "person-outline",
    colorClass: "session-meditation",
    bgClass: "session-meditation-bg",
    iconColor: "#F59E0B", // oklch(0.75 0.15 70)
    color: "#F59E0B",
    backgroundColor: "#FFFBEB", // oklch(0.98 0.02 70)
  },
  CLIENT_MEETING: {
    label: "Client Meeting",
    value: "CLIENT_MEETING",
    icon: "people-outline",
    colorClass: "session-client-meeting",
    bgClass: "session-client-meeting-bg",
    iconColor: "#EF4444", // oklch(0.6 0.2 25)
    color: "#EF4444",
    backgroundColor: "#FEF2F2", // oklch(0.98 0.02 25)
  },
  STUDY: {
    label: "Study",
    value: "STUDY",
    icon: "book-outline",
    colorClass: "session-study",
    bgClass: "session-study-bg",
    iconColor: "#6366F1", // oklch(0.55 0.2 270)
    color: "#6366F1",
    backgroundColor: "#EFF6FF", // oklch(0.97 0.02 270)
  },
  READING: {
    label: "Reading",
    value: "READING",
    icon: "book-outline",
    colorClass: "session-reading",
    bgClass: "session-reading-bg",
    iconColor: "#EC4899", // oklch(0.65 0.2 340)
    color: "#EC4899",
    backgroundColor: "#FDF2F8", // oklch(0.98 0.02 340)
  },
  OTHER: {
    label: "Other",
    value: "OTHER",
    icon: "book-outline",
    colorClass: "session-other",
    bgClass: "session-other-bg",
    iconColor: "#6B7280", // oklch(0.5 0.01 250)
    color: "#6B7280",
    backgroundColor: "#F3F4F6", // oklch(0.96 0 250)
  },
} satisfies Record<
  SessionType,
  {
    label: string;
    value: SessionType;
    colorClass: string;
    bgClass: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    color: string;
    backgroundColor: string;
  }
>;

/**
 * Get Tailwind class names for session type colors
 * Returns full class names that Tailwind can detect and generate
 */
export const getSessionTypeClasses = (type: SessionType) => {
  const classMap: Record<
    SessionType,
    { color: string; bg: string; border: string }
  > = {
    DEEP_WORK: {
      color: "text-session-deep-work",
      bg: "bg-session-deep-work-bg",
      border: "border-session-deep-work",
    },
    WORKOUT: {
      color: "text-session-workout",
      bg: "bg-session-workout-bg",
      border: "border-session-workout",
    },
    LANGUAGE: {
      color: "text-session-language",
      bg: "bg-session-language-bg",
      border: "border-session-language",
    },
    MEDITATION: {
      color: "text-session-meditation",
      bg: "bg-session-meditation-bg",
      border: "border-session-meditation",
    },
    CLIENT_MEETING: {
      color: "text-session-client-meeting",
      bg: "bg-session-client-meeting-bg",
      border: "border-session-client-meeting",
    },
    STUDY: {
      color: "text-session-study",
      bg: "bg-session-study-bg",
      border: "border-session-study",
    },
    READING: {
      color: "text-session-reading",
      bg: "bg-session-reading-bg",
      border: "border-session-reading",
    },
    OTHER: {
      color: "text-session-other",
      bg: "bg-session-other-bg",
      border: "border-session-other",
    },
  };
  return classMap[type];
};
