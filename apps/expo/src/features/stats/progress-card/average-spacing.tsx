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

  return (
    <StatCard
      iconName="trending-up-outline"
      title={`${averageSpacingHours} days`}
      description="Average spacing between sessions"
    />
  );
};
