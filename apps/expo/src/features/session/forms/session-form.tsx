import type React from "react";
import { useEffect, useMemo } from "react";
import { Text } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import type { SessionType } from "@ssp/api/client";
import type { SessionFormValues } from "@ssp/validators";
import { sessionFormSchema } from "@ssp/validators";

import type { ServerError } from "~/utils/form";
import { Button } from "~/components/button";
import { Card } from "~/components/card";
import { CardContent } from "~/components/card/card-content";
import {
  DateTimeInputGroup,
  PrioritySelector,
  SelectButtonGroup,
  TextInputField,
} from "~/components/forms/inputs";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import {
  formatDateForInput,
  formatTimeForInput,
  getCurrentTime,
  getTodayDate,
  parseLocalDateTime,
} from "~/utils/date";
import { isUnauthorizedError } from "~/utils/form";

const SESSION_TYPES_ARRAY = Object.values(SESSION_TYPES_DISPLAY);
const SESSION_TYPE_OPTIONS = SESSION_TYPES_ARRAY.map((type) => ({
  value: type.value,
  label: type.label,
}));

export type SessionFormMode = "create" | "update";

interface SessionFormPropsBase {
  isPending?: boolean;
  serverError?: ServerError;
}

interface CreateSessionFormProps extends SessionFormPropsBase {
  mode: "create";
  onSubmit: (values: {
    title: string;
    type: SessionType;
    startTime: Date;
    endTime: Date;
    priority: number;
    description?: string;
  }) => void;
  initialValues?: Partial<SessionFormValues>;
}

interface UpdateSessionFormProps extends SessionFormPropsBase {
  mode: "update";
  initialValues: {
    title: string;
    type: SessionType;
    startTime: Date | string;
    endTime: Date | string;
    priority: number;
    description?: string | null;
  };
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

type SessionFormProps = CreateSessionFormProps | UpdateSessionFormProps;

// Prop types for wrapper components (without mode)
export type CreateSessionFormWrapperProps = Omit<
  CreateSessionFormProps,
  "mode"
>;
export type UpdateSessionFormWrapperProps = Omit<
  UpdateSessionFormProps,
  "mode"
>;

export const SessionForm: React.FC<SessionFormProps> = (props) => {
  const { mode, onSubmit, isPending = false, serverError } = props;

  // Format initial values based on mode
  const formattedInitialValues = useMemo<SessionFormValues>(() => {
    if (mode === "create") {
      const prefilledValues = props.initialValues;
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
      const initialValues = props.initialValues;
      return {
        title: initialValues.title,
        type: initialValues.type,
        startDate: formatDateForInput(initialValues.startTime),
        startTime: formatTimeForInput(initialValues.startTime),
        endDate: formatDateForInput(initialValues.endTime),
        endTime: formatTimeForInput(initialValues.endTime),
        priority: initialValues.priority,
        description: initialValues.description ?? "",
      };
    }
  }, [mode, props]);

  const {
    handleSubmit,
    formState: { errors, isSubmitted },
    control,
    setValue,
    reset,
  } = useForm<SessionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(sessionFormSchema) as any,
    defaultValues: formattedInitialValues,
    mode: "onChange",
  });

  // Reset form when initial values change (similar to Formik's enableReinitialize)
  useEffect(() => {
    reset(formattedInitialValues);
  }, [formattedInitialValues, reset]);

  // Watch form values for controlled inputs
  const formValues = useWatch({ control });

  const onSubmitForm = (values: SessionFormValues) => {
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

      onSubmit(updates);
    }
  };

  const buttonText = mode === "create" ? "Create Session" : "Update Session";
  const pendingText = mode === "create" ? "Creating..." : "Updating...";
  const unauthorizedMessage =
    mode === "create"
      ? "You need to be logged in to create a session"
      : "You need to be logged in to update a session";

  return (
    <>
      <Card>
        <CardContent className="gap-4">
          <TextInputField
            label="Title"
            required
            fieldName="title"
            value={formValues.title ?? ""}
            onChangeText={(text) => setValue("title", text)}
            placeholder="e.g., Morning Meditation"
            errors={errors}
            isSubmitted={isSubmitted}
            serverError={serverError}
            maxLength={256}
          />

          <SelectButtonGroup<SessionType>
            label="Type"
            required
            fieldName="type"
            value={formValues.type ?? "OTHER"}
            options={SESSION_TYPE_OPTIONS}
            onSelect={(value) => setValue("type", value)}
            errors={errors}
            isSubmitted={isSubmitted}
            serverError={serverError}
            layout="wrap"
          />

          <PrioritySelector
            fieldName="priority"
            value={formValues.priority ?? 3}
            onChange={(priority) => setValue("priority", priority)}
            errors={errors}
            isSubmitted={isSubmitted}
            serverError={serverError}
          />

          <DateTimeInputGroup
            label="Start Date & Time"
            required
            dateFieldName="startDate"
            timeFieldName="startTime"
            dateValue={formValues.startDate ?? ""}
            timeValue={formValues.startTime ?? ""}
            onDateChange={(text) => setValue("startDate", text)}
            onTimeChange={(text) => setValue("startTime", text)}
            datePlaceholder={mode === "create" ? getTodayDate() : "YYYY-MM-DD"}
            timePlaceholder={mode === "create" ? getCurrentTime() : "HH:mm"}
            errors={errors}
            isSubmitted={isSubmitted}
            serverError={serverError}
          />

          <DateTimeInputGroup
            label="End Date & Time"
            required
            dateFieldName="endDate"
            timeFieldName="endTime"
            dateValue={formValues.endDate ?? ""}
            timeValue={formValues.endTime ?? ""}
            onDateChange={(text) => setValue("endDate", text)}
            onTimeChange={(text) => setValue("endTime", text)}
            datePlaceholder={mode === "create" ? getTodayDate() : "YYYY-MM-DD"}
            timePlaceholder={mode === "create" ? getCurrentTime() : "HH:mm"}
            errors={errors}
            isSubmitted={isSubmitted}
            serverError={serverError}
          />

          <TextInputField
            label="Description"
            fieldName="description"
            value={formValues.description ?? ""}
            onChangeText={(text) => setValue("description", text)}
            placeholder="Optional notes or description"
            errors={errors}
            isSubmitted={isSubmitted}
            serverError={serverError}
            multiline
            numberOfLines={4}
          />

          {isUnauthorizedError(serverError) && (
            <Text className="text-destructive text-center">
              {unauthorizedMessage}
            </Text>
          )}
        </CardContent>
      </Card>

      <Button
        variant="default"
        size="lg"
        onPress={handleSubmit(
          onSubmitForm as (data: SessionFormValues) => void,
        )}
        disabled={isPending}
      >
        {isPending ? pendingText : buttonText}
      </Button>
    </>
  );
};

// Export convenience wrappers for backward compatibility
// These wrappers automatically set the mode prop
export const CreateSessionForm: React.FC<CreateSessionFormWrapperProps> = (
  props,
) => <SessionForm {...props} mode="create" />;

export const UpdateSessionForm: React.FC<UpdateSessionFormWrapperProps> = (
  props,
) => <SessionForm {...props} mode="update" />;
