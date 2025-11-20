import type { SuggestedSession } from "../suggestions";
import {
  DAILY_SESSION_LIMITS,
  FATIGUE_SCORING,
  PATTERN_DETECTION,
  SCORING,
  SESSION_SPACING,
  SUGGESTION_LIMITS,
} from "../../constants/suggestions";
import { hoursBetween, isSameDay } from "../../utils/date";

/**
 * Calculate fatigue score for a day based on existing sessions
 * Penalizes days with too many high-priority sessions
 */
export function calculateDayFatigue(
  date: Date,
  existingSessions: {
    startTime: Date;
    endTime: Date;
    priority: number;
  }[],
): { fatigueScore: number; reasons: string[] } {
  const reasons: string[] = [];
  let fatigueScore = 0;

  // Get all sessions on this day
  const daySessions = existingSessions.filter((session) =>
    isSameDay(session.startTime, date),
  );

  if (daySessions.length === 0) {
    return { fatigueScore: 0, reasons: [] };
  }

  // Count high-priority sessions
  const highPriorityCount = daySessions.filter(
    (s) => s.priority >= DAILY_SESSION_LIMITS.HIGH_PRIORITY_THRESHOLD,
  ).length;

  // Penalty for too many high-priority sessions
  if (highPriorityCount > DAILY_SESSION_LIMITS.MAX_HIGH_PRIORITY_PER_DAY) {
    const excess =
      highPriorityCount - DAILY_SESSION_LIMITS.MAX_HIGH_PRIORITY_PER_DAY;
    fatigueScore += excess * FATIGUE_SCORING.PENALTY_PER_HIGH_PRIORITY;
    reasons.push(
      `${highPriorityCount} high-priority sessions already scheduled (max ${DAILY_SESSION_LIMITS.MAX_HIGH_PRIORITY_PER_DAY})`,
    );
  }

  // Penalty for too many total sessions
  if (daySessions.length >= DAILY_SESSION_LIMITS.MAX_TOTAL_SESSIONS_PER_DAY) {
    fatigueScore += FATIGUE_SCORING.TOO_MANY_SESSIONS_PENALTY;
    reasons.push(
      `${daySessions.length} sessions already scheduled (max ${DAILY_SESSION_LIMITS.MAX_TOTAL_SESSIONS_PER_DAY})`,
    );
  }

  return { fatigueScore, reasons };
}

/**
 * Calculate spacing score for a time slot
 * Improved: Better spacing logic and considers priority
 */
export function calculateSpacingScore(
  proposedStart: Date,
  proposedEnd: Date,
  proposedPriority: number,
  existingSessions: {
    startTime: Date;
    endTime: Date;
    priority: number;
  }[],
  otherSuggestions: SuggestedSession[],
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = SCORING.BASE_SPACING_SCORE;

  // Check sessions on the same day
  const sameDaySessions = existingSessions.filter((session) =>
    isSameDay(session.startTime, proposedStart),
  );

  // Check spacing between sessions
  for (const session of sameDaySessions) {
    const hoursBefore = hoursBetween(proposedStart, session.endTime);
    const hoursAfter = hoursBetween(session.startTime, proposedEnd);

    // Check if sessions overlap (shouldn't happen, but safety check)
    if (hoursBefore < 0 && hoursAfter < 0) {
      score -= SCORING.OVERLAP_PENALTY;
      reasons.push("Overlaps with existing session");
      continue;
    }

    // Penalty for too close spacing
    if (hoursBefore >= 0 && hoursBefore < SESSION_SPACING.MIN_SPACING_HOURS) {
      const penalty = Math.round(
        (1 - hoursBefore / SESSION_SPACING.MIN_SPACING_HOURS) *
          SCORING.SPACING_PENALTY_MULTIPLIER,
      );
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursBefore * 10) / 10}h after previous session`,
      );
    }
    if (hoursAfter >= 0 && hoursAfter < SESSION_SPACING.MIN_SPACING_HOURS) {
      const penalty = Math.round(
        (1 - hoursAfter / SESSION_SPACING.MIN_SPACING_HOURS) *
          SCORING.SPACING_PENALTY_MULTIPLIER,
      );
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursAfter * 10) / 10}h before next session`,
      );
    }

    // Bonus for ideal spacing
    if (
      hoursBefore >= SESSION_SPACING.IDEAL_SPACING_HOURS &&
      hoursBefore <
        SESSION_SPACING.IDEAL_SPACING_HOURS +
          SESSION_SPACING.IDEAL_SPACING_BONUS_RANGE_HOURS
    ) {
      score += SCORING.IDEAL_SPACING_BONUS;
      reasons.push("Good spacing from previous session");
    }
    if (
      hoursAfter >= SESSION_SPACING.IDEAL_SPACING_HOURS &&
      hoursAfter <
        SESSION_SPACING.IDEAL_SPACING_HOURS +
          SESSION_SPACING.IDEAL_SPACING_BONUS_RANGE_HOURS
    ) {
      score += SCORING.IDEAL_SPACING_BONUS;
      reasons.push("Good spacing before next session");
    }

    // Extra penalty if both sessions are high priority and too close
    if (
      proposedPriority >= DAILY_SESSION_LIMITS.HIGH_PRIORITY_THRESHOLD &&
      session.priority >= DAILY_SESSION_LIMITS.HIGH_PRIORITY_THRESHOLD &&
      (hoursBefore < SESSION_SPACING.IDEAL_SPACING_HOURS ||
        hoursAfter < SESSION_SPACING.IDEAL_SPACING_HOURS)
    ) {
      score -= SCORING.HIGH_PRIORITY_CLOSE_PENALTY;
      reasons.push("High-priority sessions too close together");
    }
  }

  // Check spacing from other suggestions
  for (const suggestion of otherSuggestions) {
    const hoursBefore = hoursBetween(proposedStart, suggestion.endTime);
    const hoursAfter = hoursBetween(suggestion.startTime, proposedEnd);

    if (
      hoursBefore >= 0 &&
      hoursBefore < SESSION_SPACING.MIN_SUGGESTION_SPACING_HOURS
    ) {
      score -= SCORING.CONSECUTIVE_SUGGESTION_PENALTY;
      reasons.push("Too close to another suggestion");
    }
    if (
      hoursAfter >= 0 &&
      hoursAfter < SESSION_SPACING.MIN_SUGGESTION_SPACING_HOURS
    ) {
      score -= SCORING.CONSECUTIVE_SUGGESTION_PENALTY;
      reasons.push("Too close to another suggestion");
    }
  }

  return {
    score: Math.max(SCORING.MIN_SCORE, Math.min(SCORING.MAX_SCORE, score)),
    reasons,
  };
}

/**
 * Calculate overall score for a pattern-based suggestion
 */
export function calculatePatternScore(
  pattern: {
    frequency: number;
    successRate: number;
    priority: number;
  },
  spacingResult: { score: number; reasons: string[] },
  fatigue: { fatigueScore: number; reasons: string[] },
  daysFromNow: number,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score: number = SCORING.BASE_PATTERN_SCORE;

  // Pattern frequency bonus (more frequent patterns score higher)
  const frequencyBonus = Math.min(
    pattern.frequency * SCORING.FREQUENCY_BONUS_MULTIPLIER,
    SCORING.MAX_FREQUENCY_BONUS,
  );
  score += frequencyBonus;

  // Success rate bonus (patterns with high completion rate score higher)
  const successBonus = Math.round(
    pattern.successRate * SCORING.SUCCESS_RATE_BONUS_MULTIPLIER,
  );
  score += successBonus;
  if (pattern.successRate > PATTERN_DETECTION.HIGH_SUCCESS_RATE_THRESHOLD) {
    reasons.push("High completion rate for this pattern");
  }

  // Spacing score (weighted)
  score += Math.floor(spacingResult.score * SCORING.SPACING_SCORE_WEIGHT);
  reasons.push(...spacingResult.reasons);

  // Fatigue penalty
  score -= fatigue.fatigueScore;
  reasons.push(...fatigue.reasons);

  // Bonus for earlier dates (sooner is better, but not too much)
  if (daysFromNow <= SUGGESTION_LIMITS.NEAR_TERM_BONUS_DAYS) {
    score += SCORING.NEAR_TERM_BONUS;
    reasons.push("Available soon");
  }

  // Priority bonus (higher priority patterns get slight bonus, but fatigue already penalizes clustering)
  if (pattern.priority >= DAILY_SESSION_LIMITS.HIGH_PRIORITY_THRESHOLD) {
    score += SCORING.HIGH_PRIORITY_BONUS;
  }

  // Ensure score is within bounds
  score = Math.max(SCORING.MIN_SCORE, Math.min(SCORING.MAX_SCORE, score));

  return { score, reasons };
}
