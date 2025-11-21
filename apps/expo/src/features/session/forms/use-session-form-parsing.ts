import { useCallback } from "react";

import type { SessionFormValues } from "@ssp/validators";

import { parseLocalDateTime } from "~/utils/date";
import { useToast } from "~/hooks/use-toast";

/**
 * Hook for parsing session form values into Date objects
 * Handles date/time parsing and validation
 */
export function useSessionFormParsing() {
  const toast = useToast();

  const parseFormDates = useCallback(
    (values: SessionFormValues): { startTime: Date; endTime: Date } | null => {
      // Parse date and time strings into Date objects in local timezone
      // This ensures proper timezone handling and validation
      const startTimeDate = parseLocalDateTime(
        values.startDate,
        values.startTime,
      );
      const endTimeDate = parseLocalDateTime(values.endDate, values.endTime);

      // Validate dates before submitting
      if (!startTimeDate || !endTimeDate) {
        toast.error("Invalid date/time. Please check your inputs.");
        return null;
      }

      return {
        startTime: startTimeDate,
        endTime: endTimeDate,
      };
    },
    [toast],
  );

  return { parseFormDates };
}

