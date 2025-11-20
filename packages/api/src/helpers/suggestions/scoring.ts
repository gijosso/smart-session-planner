import type { SessionType } from "@ssp/db/schema";

import type { SessionPattern } from "./pattern-detection";
import type { SuggestedSession } from "./queries";
import { DATE_CONSTANTS, SUGGESTION_CONSTANTS } from "../../utils/constants";

/**
 * Calculate spacing score for a time slot
 * Penalizes clustering and rewards good spacing
 */
export function calculateSpacingScore(
  proposedStart: Date,
  proposedEnd: Date,
  existingSessions: { startTime: Date; endTime: Date }[],
  otherSuggestions: SuggestedSession[],
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score: number = SUGGESTION_CONSTANTS.MAX_SCORE;

  // Check sessions on the same day
  const sameDaySessions = existingSessions.filter((session) => {
    const sessionDate = new Date(session.startTime);
    const proposedDate = new Date(proposedStart);
    return (
      sessionDate.getUTCFullYear() === proposedDate.getUTCFullYear() &&
      sessionDate.getUTCMonth() === proposedDate.getUTCMonth() &&
      sessionDate.getUTCDate() === proposedDate.getUTCDate()
    );
  });

  // Check spacing between sessions
  const minSpacingHours = SUGGESTION_CONSTANTS.MIN_SESSION_SPACING_HOURS;
  const msPerHour = DATE_CONSTANTS.MS_PER_HOUR;
  for (const session of sameDaySessions) {
    const hoursBefore =
      (proposedStart.getTime() - session.endTime.getTime()) / msPerHour;
    const hoursAfter =
      (session.startTime.getTime() - proposedEnd.getTime()) / msPerHour;

    if (hoursBefore >= 0 && hoursBefore < minSpacingHours) {
      const penalty = Math.round(
        (1 - hoursBefore / minSpacingHours) *
          SUGGESTION_CONSTANTS.SPACING_PENALTY_MULTIPLIER,
      );
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursBefore * 10) / 10}h after previous session`,
      );
    }
    if (hoursAfter >= 0 && hoursAfter < minSpacingHours) {
      const penalty = Math.round(
        (1 - hoursAfter / minSpacingHours) *
          SUGGESTION_CONSTANTS.SPACING_PENALTY_MULTIPLIER,
      );
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursAfter * 10) / 10}h before next session`,
      );
    }
  }

  // Check spacing from other suggestions (prevent consecutive slots)
  for (const suggestion of otherSuggestions) {
    const hoursBefore =
      (proposedStart.getTime() - suggestion.endTime.getTime()) /
      DATE_CONSTANTS.MS_PER_HOUR;
    const hoursAfter =
      (suggestion.startTime.getTime() - proposedEnd.getTime()) /
      DATE_CONSTANTS.MS_PER_HOUR;

    // Strong penalty for overlapping or very close suggestions
    if (hoursBefore >= 0 && hoursBefore < 1) {
      score -= SUGGESTION_CONSTANTS.CONSECUTIVE_SUGGESTION_PENALTY;
      reasons.push("Too close to another suggestion");
    }
    if (hoursAfter >= 0 && hoursAfter < 1) {
      score -= SUGGESTION_CONSTANTS.CONSECUTIVE_SUGGESTION_PENALTY;
      reasons.push("Too close to another suggestion");
    }
  }

  // Bonus for good spacing
  const hasGoodSpacing = sameDaySessions.every((session) => {
    const hoursBefore =
      (proposedStart.getTime() - session.endTime.getTime()) / msPerHour;
    const hoursAfter =
      (session.startTime.getTime() - proposedEnd.getTime()) / msPerHour;
    return (
      (hoursBefore < 0 || hoursBefore >= minSpacingHours) &&
      (hoursAfter < 0 || hoursAfter >= minSpacingHours)
    );
  });

  if (hasGoodSpacing && sameDaySessions.length > 0) {
    score += SUGGESTION_CONSTANTS.GOOD_SPACING_BONUS;
    reasons.push("Good spacing from other sessions");
  }

  return {
    score: Math.max(
      SUGGESTION_CONSTANTS.MIN_SCORE,
      Math.min(SUGGESTION_CONSTANTS.MAX_SCORE, score),
    ),
    reasons,
  };
}

/**
 * Calculate score for a suggestion based on pattern, spacing, and timing
 */
export function calculateSuggestionScore(
  pattern: SessionPattern,
  slotStart: Date,
  slotEnd: Date,
  activeSessions: { startTime: Date; endTime: Date }[],
  otherSuggestions: SuggestedSession[],
  sessionTypeLabels: Record<SessionType, string>,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score: number = SUGGESTION_CONSTANTS.BASE_SCORE;

  // Pattern frequency bonus (more frequent patterns score higher)
  const frequencyBonus = Math.min(
    pattern.frequency * SUGGESTION_CONSTANTS.FREQUENCY_BONUS_MULTIPLIER,
    SUGGESTION_CONSTANTS.MAX_FREQUENCY_BONUS,
  );
  score += frequencyBonus;
  reasons.push(
    `Based on ${pattern.frequency} previous ${sessionTypeLabels[pattern.type]} session${pattern.frequency > 1 ? "s" : ""}`,
  );

  // Spacing score (check against existing sessions and other suggestions)
  const spacingResult = calculateSpacingScore(
    slotStart,
    slotEnd,
    activeSessions,
    otherSuggestions,
  );
  score += spacingResult.score - SUGGESTION_CONSTANTS.MAX_SCORE; // spacingResult.score is 0-100, we want to add/subtract from base
  reasons.push(...spacingResult.reasons);

  // Bonus for earlier dates (sooner is better, but not too much)
  const daysFromNow = Math.floor(
    (slotStart.getTime() - new Date().getTime()) / DATE_CONSTANTS.MS_PER_DAY,
  );
  if (daysFromNow <= SUGGESTION_CONSTANTS.SOON_DAYS_THRESHOLD) {
    score += SUGGESTION_CONSTANTS.SOON_BONUS_SCORE;
    reasons.push("Available soon");
  }

  // Ensure score is within bounds
  score = Math.max(
    SUGGESTION_CONSTANTS.MIN_SCORE,
    Math.min(SUGGESTION_CONSTANTS.MAX_SCORE, score),
  );

  return { score, reasons };
}
