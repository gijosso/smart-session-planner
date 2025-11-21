/**
 * Re-export date formatting functions from utils/date for backward compatibility
 * @deprecated Use formatDateDisplay from ~/utils/date instead
 */
export { formatDateDisplay } from "~/utils/date";

/**
 * Format time range for display
 * Note: This is a duplicate of formatTimeRange in utils/date.ts
 * Kept here for backward compatibility, but consider using the one from utils/date
 */
export function formatTimeRange(startTime: Date, endTime: Date): string {
  const start = startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const end = endTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${start}–${end}`;
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 45) return "Fair";
  return "Okay";
}
