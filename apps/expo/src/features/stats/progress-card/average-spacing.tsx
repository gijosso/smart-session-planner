import type React from "react";

import { StatCard } from "./stat-card";

interface AverageSpacingProps {
  averageSpacingHours: number | null;
}

/**
 * Component displaying the average spacing between sessions
 */
export const AverageSpacing: React.FC<AverageSpacingProps> = ({
  averageSpacingHours,
}) => {
  if (averageSpacingHours === null) {
    return null;
  }

  // Convert hours to days, rounding to 1 decimal place
  const averageSpacingDays = Math.round((averageSpacingHours / 24) * 10) / 10;

  return (
    <StatCard
      iconName="trending-up-outline"
      title={`${averageSpacingDays} days`}
      description="Average spacing between sessions"
    />
  );
};
