import type React from "react";
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

import type { WeeklyAvailability } from "@ssp/api/client";
import { DAYS_OF_WEEK } from "@ssp/api/client";

import { Card } from "~/components";
import { DAYS_OF_WEEK_DISPLAY } from "~/constants/activity";
import { formatTimeFromFull } from "~/utils/date";

interface AvailabilityCalendarProps {
  weeklyAvailability: WeeklyAvailability;
  onTimeSlotPress?: (
    dayOfWeek: string,
    timeWindow: { startTime: string; endTime: string },
  ) => void;
}

/**
 * Converts time string (HH:MM:SS) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/**
 * Generates time slots for a day (every hour from 00:00 to 23:00)
 */
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00:00`);
  }
  return slots;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  weeklyAvailability,
}) => {
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const dayOrder = DAYS_OF_WEEK; // Already in order: MONDAY to SUNDAY

  // Memoize windows per day to avoid repeated lookups
  const windowsByDay = useMemo(() => {
    const result: Record<string, Array<{ startTime: string; endTime: string }>> =
      {};
    for (const day of dayOrder) {
      result[day] =
        day in weeklyAvailability ? weeklyAvailability[day] : [];
    }
    return result;
  }, [weeklyAvailability, dayOrder]);

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-4">
        <Card variant="outline" className="overflow-hidden">
          {/* Header with day names */}
          <View className="border-border flex flex-row border-b">
            <View className="border-border w-20 border-r p-2">
              <Text className="text-muted-foreground text-xs font-medium">
                Time
              </Text>
            </View>
            {dayOrder.map((day) => (
              <View key={day} className="flex-1 p-2">
                <Text className="text-foreground text-center text-xs font-semibold">
                  {DAYS_OF_WEEK_DISPLAY[day].label.slice(0, 3)}
                </Text>
              </View>
            ))}
          </View>

          {/* Time slots - show every hour */}
          {timeSlots.map((slotTime, slotIndex) => {
            const nextSlotTime =
              slotIndex < timeSlots.length - 1
                ? (timeSlots[slotIndex + 1] ?? "24:00:00")
                : "24:00:00";

            return (
              <View
                key={slotTime}
                className="border-border flex flex-row border-b"
              >
                {/* Time label */}
                <View className="border-border w-20 border-r p-2">
                  <Text className="text-muted-foreground text-xs">
                    {formatTimeFromFull(slotTime)}
                  </Text>
                </View>

                {/* Day columns */}
                {dayOrder.map((day) => {
                  const windows = windowsByDay[day] ?? [];
                  const slotMinutes = timeToMinutes(slotTime);
                  const nextSlotMinutes = timeToMinutes(nextSlotTime);

                  // Find windows that overlap with this hour slot
                  const overlappingWindows = windows.filter((window) => {
                    const windowStart = timeToMinutes(window.startTime);
                    const windowEnd = timeToMinutes(window.endTime);
                    return (
                      windowStart < nextSlotMinutes && windowEnd > slotMinutes
                    );
                  });

                  const hasAvailability = overlappingWindows.length > 0;
                  // Find the earliest start and latest end of overlapping windows
                  const windowStart =
                    overlappingWindows.length > 0
                      ? overlappingWindows.reduce((earliest, window) =>
                          timeToMinutes(window.startTime) <
                          timeToMinutes(earliest.startTime)
                            ? window
                            : earliest,
                        ).startTime
                      : null;
                  const windowEnd =
                    overlappingWindows.length > 0
                      ? overlappingWindows.reduce((latest, window) =>
                          timeToMinutes(window.endTime) >
                          timeToMinutes(latest.endTime)
                            ? window
                            : latest,
                        ).endTime
                      : null;
                  const isWindowStart = windowStart === slotTime;

                  return (
                    <View
                      key={`${day}-${slotTime}`}
                      className={`flex-1 p-1 ${
                        hasAvailability ? "bg-primary/20" : "bg-transparent"
                      }`}
                    >
                      {isWindowStart && windowStart && windowEnd && (
                        <View className="bg-primary rounded px-1 py-0.5">
                          <Text className="text-primary-foreground text-[10px] font-medium">
                            {formatTimeFromFull(windowStart)} -{" "}
                            {formatTimeFromFull(windowEnd)}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </Card>

        {/* Legend */}
        <View className="mt-4 flex flex-row items-center gap-4">
          <View className="flex flex-row items-center gap-2">
            <View className="bg-primary/20 h-4 w-4 rounded" />
            <Text className="text-muted-foreground text-xs">Available</Text>
          </View>
          <View className="flex flex-row items-center gap-2">
            <View className="bg-primary h-4 w-4 rounded" />
            <Text className="text-muted-foreground text-xs">Time Window</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
