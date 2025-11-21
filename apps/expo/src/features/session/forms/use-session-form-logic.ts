import type { UseFormHandleSubmit } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import type { SessionType } from "@ssp/api/client";
import type { SessionFormValues } from "@ssp/validators";
import { sessionFormSchema } from "@ssp/validators";

import {
  formatDateForInput,
  formatTimeForInput,
  getCurrentTime,
  getTodayDate,
} from "~/utils/date";

export type SessionFormMode = "create" | "update";

interface CreateSessionFormInitialValues {
  mode: "create";
  initialValues?: Partial<SessionFormValues>;
}

interface UpdateSessionFormInitialValues {
  mode: "update";
  initialValues: {
    title: string;
    type: string;
    startTime: Date | string;
    endTime: Date | string;
    priority: number;
    description?: string | null;
  };
}

type SessionFormInitialValues =
  | CreateSessionFormInitialValues
  | UpdateSessionFormInitialValues;

/**
 * Hook for managing session form logic
 * Handles form initialization, state management, and value watching
 */
export function useSessionFormLogic(initialValues: SessionFormInitialValues) {
  const { mode } = initialValues;

  // Format initial values based on mode
  const formattedInitialValues = useMemo<SessionFormValues>(() => {
    if (mode === "create") {
      const prefilledValues = initialValues.initialValues;
      return {
        title: prefilledValues?.title ?? "",
        type: prefilledValues?.type ?? "OTHER",
        startDate: prefilledValues?.startDate ?? getTodayDate(),
        startTime: prefilledValues?.startTime ?? getCurrentTime(),
        endDate: prefilledValues?.endDate ?? getTodayDate(),
        endTime: prefilledValues?.endTime ?? getCurrentTime(),
        priority: prefilledValues?.priority ?? 3,
        description: prefilledValues?.description ?? "",
      };
    } else {
      // Update mode
      const values = initialValues.initialValues;
      return {
        title: values.title,
        type: values.type as SessionType,
        startDate: formatDateForInput(values.startTime),
        startTime: formatTimeForInput(values.startTime),
        endDate: formatDateForInput(values.endTime),
        endTime: formatTimeForInput(values.endTime),
        priority: values.priority,
        description: values.description ?? "",
      };
    }
  }, [mode, initialValues]);

  const {
    handleSubmit,
    formState: { errors, isSubmitted },
    control,
    setValue,
    reset,
  } = useForm<SessionFormValues>({
    // @ts-expect-error - Zod v4 input/output type mismatch: zodResolver infers input type but react-hook-form expects output type
    resolver: zodResolver(sessionFormSchema),
    defaultValues: formattedInitialValues,
    mode: "onChange",
  });

  // Reset form when initial values change (similar to Formik's enableReinitialize)
  useEffect(() => {
    reset(formattedInitialValues);
  }, [formattedInitialValues, reset]);

  // Watch form values for controlled inputs
  const formValues = useWatch({ control });

  return {
    handleSubmit:
      handleSubmit as unknown as UseFormHandleSubmit<SessionFormValues>,
    errors,
    isSubmitted,
    formValues,
    setValue,
    formattedInitialValues,
  };
}
