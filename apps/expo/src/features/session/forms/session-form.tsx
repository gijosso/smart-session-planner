import React, { useMemo, useEffect } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { SessionType } from "@ssp/api/client";
import type { SessionFormValues } from "@ssp/validators";
import { sessionFormSchema } from "@ssp/validators";

import type { ServerError } from "~/utils/form";
import { Button } from "~/components";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import {
  formatDateForInput,
  formatTimeForInput,
  getCurrentTime,
  getTodayDate,
  parseLocalDateTime,
} from "~/utils/date";
import {
  getFieldError,
  getFieldErrorClassName,
  isUnauthorizedError,
} from "~/utils/form";

const PRIORITY_LEVELS = [1, 2, 3, 4, 5] as const;
const SESSION_TYPES_ARRAY = Object.values(SESSION_TYPES_DISPLAY);

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
    watch,
    setValue,
    reset,
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema) as any,
    defaultValues: formattedInitialValues,
    mode: "onChange",
  });

  // Reset form when initial values change (similar to Formik's enableReinitialize)
  useEffect(() => {
    reset(formattedInitialValues);
  }, [formattedInitialValues, reset]);

  // Watch form values for controlled inputs
  const formValues = watch();

  const onSubmitForm = (values: SessionFormValues) => {
    // Parse date and time strings into Date objects in local timezone
    // This ensures proper timezone handling and validation
    const startTimeDate = parseLocalDateTime(values.startDate, values.startTime);
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
      const initialStartTime = new Date(
        `${formattedInitialValues.startDate}T${formattedInitialValues.startTime}:00`,
      );
      const initialEndTime = new Date(
        `${formattedInitialValues.endDate}T${formattedInitialValues.endTime}:00`,
      );

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

  // Helper to get field error using centralized utility
  const getFieldErrorForField = (
    fieldName: keyof SessionFormValues,
  ): string | undefined => {
    return getFieldError(fieldName, errors, isSubmitted, serverError);
  };

  const buttonText = mode === "create" ? "Create Session" : "Update Session";
  const pendingText = mode === "create" ? "Creating..." : "Updating...";
  const unauthorizedMessage =
    mode === "create"
      ? "You need to be logged in to create a session"
      : "You need to be logged in to update a session";

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={true}
      className="flex-1"
    >
      <View className="mb-4">
        <Text className="text-foreground mb-2 text-sm font-medium">
          Title *
        </Text>
        <TextInput
          className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${getFieldErrorClassName(
            "title",
            errors,
            isSubmitted,
            serverError,
          )}`}
          value={formValues.title}
          onChangeText={(text) => setValue("title", text)}
          onBlur={() => {}}
          placeholder="e.g., Morning Meditation"
          maxLength={256}
        />
        {getFieldErrorForField("title") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldErrorForField("title")}
          </Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-foreground mb-2 text-sm font-medium">Type *</Text>
        <View className="flex flex-row flex-wrap gap-2">
          {SESSION_TYPES_ARRAY.map((sessionType) => (
            <Pressable
              key={sessionType.value}
              onPress={() => setValue("type", sessionType.value)}
              className={`rounded-md border px-3 py-2 ${
                formValues.type === sessionType.value
                  ? "bg-primary border-primary"
                  : "border-input bg-background"
              }`}
            >
              <Text
                className={
                  formValues.type === sessionType.value
                    ? "text-primary-foreground text-sm font-medium"
                    : "text-foreground text-sm"
                }
              >
                {sessionType.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {getFieldErrorForField("type") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldErrorForField("type")}
          </Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-foreground mb-2 text-sm font-medium">
          Priority *
        </Text>
        <View className="flex flex-row gap-2">
          {PRIORITY_LEVELS.map((priority) => (
            <Pressable
              key={priority}
              onPress={() => setValue("priority", priority)}
              className={`flex-1 rounded-md border px-3 py-2 ${
                formValues.priority === priority
                  ? "bg-primary border-primary"
                  : "border-input bg-background"
              }`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  formValues.priority === priority
                    ? "text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                {priority}
              </Text>
            </Pressable>
          ))}
        </View>
        {getFieldErrorForField("priority") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldErrorForField("priority")}
          </Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-foreground mb-2 text-sm font-medium">
          Start Date & Time *
        </Text>
        <View className="flex flex-row gap-2">
          <View className="flex-1">
            <TextInput
              className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${getFieldErrorClassName(
                "startDate",
                errors,
                isSubmitted,
                serverError,
              )}`}
              value={formValues.startDate}
              onChangeText={(text) => setValue("startDate", text)}
              onBlur={() => {}}
              placeholder={mode === "create" ? getTodayDate() : "YYYY-MM-DD"}
              placeholderTextColor="#71717A"
            />
            <Text className="text-muted-foreground mt-1 text-xs">
              Format: YYYY-MM-DD
            </Text>
          </View>
          <View className="flex-1">
            <TextInput
              className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${getFieldErrorClassName(
                "startTime",
                errors,
                isSubmitted,
                serverError,
              )}`}
              value={formValues.startTime}
              onChangeText={(text) => setValue("startTime", text)}
              onBlur={() => {}}
              placeholder={mode === "create" ? getCurrentTime() : "HH:mm"}
              placeholderTextColor="#71717A"
            />
            <Text className="text-muted-foreground mt-1 text-xs">
              Format: HH:mm (24h)
            </Text>
          </View>
        </View>
        {(getFieldErrorForField("startDate") ??
          getFieldErrorForField("startTime")) && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldErrorForField("startDate") ??
              getFieldErrorForField("startTime")}
          </Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-foreground mb-2 text-sm font-medium">
          End Date & Time *
        </Text>
        <View className="flex flex-row gap-2">
          <View className="flex-1">
            <TextInput
              className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${getFieldErrorClassName(
                "endDate",
                errors,
                isSubmitted,
                serverError,
              )}`}
              value={formValues.endDate}
              onChangeText={(text) => setValue("endDate", text)}
              onBlur={() => {}}
              placeholder={mode === "create" ? getTodayDate() : "YYYY-MM-DD"}
              placeholderTextColor="#71717A"
            />
            <Text className="text-muted-foreground mt-1 text-xs">
              Format: YYYY-MM-DD
            </Text>
          </View>
          <View className="flex-1">
            <TextInput
              className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${getFieldErrorClassName(
                "endTime",
                errors,
                isSubmitted,
                serverError,
              )}`}
              value={formValues.endTime}
              onChangeText={(text) => setValue("endTime", text)}
              onBlur={() => {}}
              placeholder={mode === "create" ? getCurrentTime() : "HH:mm"}
              placeholderTextColor="#71717A"
            />
            <Text className="text-muted-foreground mt-1 text-xs">
              Format: HH:mm (24h)
            </Text>
          </View>
        </View>
        {(getFieldErrorForField("endDate") ??
          getFieldErrorForField("endTime")) && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldErrorForField("endDate") ??
              getFieldErrorForField("endTime")}
          </Text>
        )}
      </View>

      <View className="mb-6">
        <Text className="text-foreground mb-2 text-sm font-medium">
          Description
        </Text>
        <TextInput
          className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-base"
          value={formValues.description}
          onChangeText={(text) => setValue("description", text)}
          onBlur={() => {}}
          placeholder="Optional notes or description"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {getFieldErrorForField("description") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldErrorForField("description")}
          </Text>
        )}
      </View>

      {isUnauthorizedError(serverError) && (
        <Text className="text-destructive mb-4 text-center">
          {unauthorizedMessage}
        </Text>
      )}

      <Button
        variant="default"
        onPress={handleSubmit(onSubmitForm as any)}
        disabled={isPending}
      >
        {isPending ? pendingText : buttonText}
      </Button>
    </ScrollView>
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
