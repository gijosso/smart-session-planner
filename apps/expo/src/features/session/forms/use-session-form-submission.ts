import { useCallback } from "react";

import type { SessionType } from "@ssp/api/client";
import type { SessionFormValues } from "@ssp/validators";

import { parseLocalDateTime } from "~/utils/date";

export type SessionFormMode = "create" | "update";

interface CreateSessionFormSubmitHandler {
  mode: "create";
  onSubmit: (values: {
    title: string;
    type: SessionType;
    startTime: Date;
    endTime: Date;
    priority: number;
    description?: string;
  }) => void;
}

interface UpdateSessionFormSubmitHandler {
  mode: "update";
  onSubmit: (values: {
    title?: string;
    type?: SessionType;
    startTime?: Date;
    endTime?: Date;
    priority?: number;
    description?: string;
    completed?: boolean;
  }) => void;
}

type SessionFormSubmitHandler =
  | CreateSessionFormSubmitHandler
  | UpdateSessionFormSubmitHandler;

/**
 * Hook for handling session form submission logic
 * Parses form values and handles create vs update mode differences
 */
export function useSessionFormSubmission(
  mode: SessionFormMode,
  onSubmit: SessionFormSubmitHandler["onSubmit"],
  formattedInitialValues: SessionFormValues,
) {
  const onSubmitForm = useCallback(
    (values: SessionFormValues) => {
      // Parse date and time strings into Date objects in local timezone
      // This ensures proper timezone handling and validation
      const startTimeDate = parseLocalDateTime(
        values.startDate,
        values.startTime,
      );
      const endTimeDate = parseLocalDateTime(values.endDate, values.endTime);

      // Validate dates before submitting
      if (!startTimeDate || !endTimeDate) {
        // Dates are invalid, don't submit
        return;
      }

      if (mode === "create") {
        // Create mode: submit all required fields
        onSubmit({
          title: values.title,
          type: values.type,
          startTime: startTimeDate,
          endTime: endTimeDate,
          priority: values.priority,
          description: values.description ?? undefined,
        });
      } else {
        // Update mode: only submit changed fields
        const updates: {
          title?: string;
          type?: SessionType;
          startTime?: Date;
          endTime?: Date;
          priority?: number;
          description?: string;
        } = {};

        // Compare with initial values to only send changed fields
        if (values.title !== formattedInitialValues.title) {
          updates.title = values.title;
        }
        if (values.type !== formattedInitialValues.type) {
          updates.type = values.type;
        }
        if (values.priority !== formattedInitialValues.priority) {
          updates.priority = values.priority;
        }
        if (values.description !== formattedInitialValues.description) {
          // Send the description value directly (empty string clears, non-empty updates)
          updates.description = values.description;
        }

        // Check if times have changed by comparing the Date objects
        // Use parseLocalDateTime for consistency with form submission
        const initialStartTime = parseLocalDateTime(
          formattedInitialValues.startDate,
          formattedInitialValues.startTime,
        );
        const initialEndTime = parseLocalDateTime(
          formattedInitialValues.endDate,
          formattedInitialValues.endTime,
        );

        // Skip comparison if dates are invalid
        if (!initialStartTime || !initialEndTime) {
          return;
        }

        if (startTimeDate.getTime() !== initialStartTime.getTime()) {
          updates.startTime = startTimeDate;
        }
        if (endTimeDate.getTime() !== initialEndTime.getTime()) {
          updates.endTime = endTimeDate;
        }

        // Validate that if both times are being updated, endTime > startTime
        // (This matches server-side validation)
        if (updates.startTime && updates.endTime) {
          if (updates.endTime <= updates.startTime) {
            // This should be caught by form validation, but double-check
            return;
          }
        }

        // Only submit if there are actual changes
        if (Object.keys(updates).length === 0) {
          // No changes, don't submit
          return;
        }

        onSubmit({
          title: updates.title ?? "",
          type: updates.type ?? "OTHER",
          startTime: updates.startTime ?? new Date(),
          endTime: updates.endTime ?? new Date(),
          priority: updates.priority ?? 3,
          description: updates.description ?? "",
        });
      }
    },
    [mode, onSubmit, formattedInitialValues],
  );

  return onSubmitForm;
}
