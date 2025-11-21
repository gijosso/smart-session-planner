/**
 * Theme color constants
 * Maps to Tailwind CSS theme colors for consistent theming
 * These are used for components that need actual color values (e.g., Ionicons)
 */

// Error/Destructive colors
export const COLORS_DESTRUCTIVE = "#EF4444"; // red-500
export const COLORS_DESTRUCTIVE_FOREGROUND = "#FFFFFF"; // white

// Muted/Foreground colors
export const COLORS_MUTED = "#71717A"; // zinc-500
export const COLORS_MUTED_FOREGROUND = "#A1A1AA"; // zinc-400

// Foreground colors (theme-aware)
export const COLORS_FOREGROUND_LIGHT = "#18181B"; // zinc-900 (dark text on light bg)
export const COLORS_FOREGROUND_DARK = "#FAFAFA"; // zinc-50 (light text on dark bg)

// Background colors
export const COLORS_BACKGROUND_LIGHT = "#FFFFFF"; // white
export const COLORS_BACKGROUND_DARK = "#18181B"; // zinc-900

/**
 * Get foreground color based on color scheme
 * Returns appropriate color for text/icons based on theme
 */
export function getForegroundColor(colorScheme: "light" | "dark" | null): string {
  return colorScheme === "dark" ? COLORS_FOREGROUND_DARK : COLORS_FOREGROUND_LIGHT;
}

