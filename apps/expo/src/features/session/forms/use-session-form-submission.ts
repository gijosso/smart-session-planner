import { useCallback } from "react";

import type { SessionType } from "@ssp/api/client";
import type { SessionFormValues } from "@ssp/validators";

import { useSessionFormChanges } from "./use-session-form-changes";
import { useSessionFormParsing } from "./use-session-form-parsing";

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
 * Combines parsing and change detection to handle create vs update mode differences
 */
export function useSessionFormSubmission(
  mode: SessionFormMode,
  onSubmit: SessionFormSubmitHandler["onSubmit"],
  formattedInitialValues: SessionFormValues,
) {
  const { parseFormDates } = useSessionFormParsing();
  const { detectChanges } = useSessionFormChanges();

  const onSubmitForm = useCallback(
    (values: SessionFormValues) => {
      // Parse dates first
      const parsedDates = parseFormDates(values);
      if (!parsedDates) {
        // Parsing failed, error already shown to user
        return;
      }

      if (mode === "create") {
        // Create mode: submit all required fields
        (onSubmit as CreateSessionFormSubmitHandler["onSubmit"])({
          title: values.title,
          type: values.type,
          startTime: parsedDates.startTime,
          endTime: parsedDates.endTime,
          priority: values.priority,
          description: values.description ?? undefined,
        });
      } else {
        // Update mode: only submit changed fields
        const updates = detectChanges(
          values,
          formattedInitialValues,
          parsedDates,
        );

        // Only submit if there are actual changes
        if (Object.keys(updates).length === 0) {
          // No changes, don't submit
          return;
        }

        // Only send fields that actually changed (no fallback values)
        // This ensures we don't send invalid date combinations
        const submitData: {
          title?: string;
          type?: SessionType;
          startTime?: Date;
          endTime?: Date;
          priority?: number;
          description?: string;
        } = {};

        if (updates.title !== undefined) submitData.title = updates.title;
        if (updates.type !== undefined) submitData.type = updates.type;
        if (updates.startTime !== undefined)
          submitData.startTime = updates.startTime;
        if (updates.endTime !== undefined) submitData.endTime = updates.endTime;
        if (updates.priority !== undefined)
          submitData.priority = updates.priority;
        if (updates.description !== undefined)
          submitData.description = updates.description;

        (onSubmit as UpdateSessionFormSubmitHandler["onSubmit"])(submitData);
      }
    },
    [mode, onSubmit, formattedInitialValues, parseFormDates, detectChanges],
  );

  return onSubmitForm;
}
