import type React from "react";

import { StatCard } from "./stat-card";

interface StreaksProps {
  currentStreakDays: number;
  longestStreakDays: number;
}

/**
 * Component displaying current and longest streak information
 */
export const Streaks: React.FC<StreaksProps> = ({
  currentStreakDays,
  longestStreakDays,
}) => {
  if (currentStreakDays === 0 && longestStreakDays === 0) {
    return null;
  }

  if (currentStreakDays > 0) {
    return (
      <StatCard
        iconName="trophy-outline"
        title={`${currentStreakDays} day${currentStreakDays > 1 ? "s" : ""}`}
        description="Current streak"
      />
    );
  }

  return (
    <StatCard
      iconName="trophy-outline"
      title={`${longestStreakDays} day${longestStreakDays > 1 ? "s" : ""}`}
      description="Longest streak"
    />
  );
};
