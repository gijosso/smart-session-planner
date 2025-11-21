import { Text } from "react-native";

import { CardContent, TimeDisplay } from "~/components";
import {
  formatDateDisplay,
  formatTimeRange,
} from "~/utils/suggestions/suggestion-formatting";

interface SessionDetailsProps {
  startTime: Date;
  endTime: Date;
  description?: string | null;
}

export function SessionDetails({
  startTime,
  endTime,
  description,
}: SessionDetailsProps) {
  const formattedDate = formatDateDisplay(startTime);
  const formattedTimeRange = formatTimeRange(startTime, endTime);

  return (
    <CardContent className="flex flex-1 flex-col justify-center gap-4">
      <TimeDisplay
        timeRange={formattedTimeRange}
        date={formattedDate}
        showSeparator={true}
      />

      {description && (
        <Text className="text-secondary-foreground" numberOfLines={3}>
          {description}.
        </Text>
      )}
    </CardContent>
  );
}

