import { useCallback } from "react";

import type { SessionType } from "@ssp/api/client";
import type { SessionFormValues } from "@ssp/validators";

import { parseLocalDateTime } from "~/utils/date";

/**
 * Hook for detecting changes in session form values
 * Compares current values with initial values to determine what changed
 */
export function useSessionFormChanges() {
  const detectChanges = useCallback(
    (
      currentValues: SessionFormValues,
      initialValues: SessionFormValues,
      parsedDates: { startTime: Date; endTime: Date },
    ): {
      title?: string;
      type?: SessionType;
      startTime?: Date;
      endTime?: Date;
      priority?: number;
      description?: string;
    } => {
      const updates: {
        title?: string;
        type?: SessionType;
        startTime?: Date;
        endTime?: Date;
        priority?: number;
        description?: string;
      } = {};

      // Compare with initial values to only send changed fields
      if (currentValues.title !== initialValues.title) {
        updates.title = currentValues.title;
      }
      if (currentValues.type !== initialValues.type) {
        updates.type = currentValues.type;
      }
      if (currentValues.priority !== initialValues.priority) {
        updates.priority = currentValues.priority;
      }
      if (currentValues.description !== initialValues.description) {
        // Send the description value directly (empty string clears, non-empty updates)
        updates.description = currentValues.description;
      }

      // Check if times have changed by comparing the Date objects
      // Use parseLocalDateTime for consistency with form submission
      const initialStartTime = parseLocalDateTime(
        initialValues.startDate,
        initialValues.startTime,
      );
      const initialEndTime = parseLocalDateTime(
        initialValues.endDate,
        initialValues.endTime,
      );

      // Skip comparison if dates are invalid
      if (!initialStartTime || !initialEndTime) {
        return updates;
      }

      if (parsedDates.startTime.getTime() !== initialStartTime.getTime()) {
        updates.startTime = parsedDates.startTime;
      }
      if (parsedDates.endTime.getTime() !== initialEndTime.getTime()) {
        updates.endTime = parsedDates.endTime;
      }

      // Validate that if both times are being updated, endTime > startTime
      // (This matches server-side validation)
      if (updates.startTime && updates.endTime) {
        if (updates.endTime <= updates.startTime) {
          // This should be caught by form validation, but double-check
          // Return empty updates to prevent submission
          return {};
        }
      }

      return updates;
    },
    [],
  );

  return { detectChanges };
}

