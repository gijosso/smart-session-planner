import type React from "react";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFormik } from "formik";

import type { SessionType } from "@ssp/api/client";

import type { SessionFormValues } from "../session-form-schema";
import type { ServerError } from "~/utils/formik";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { formatDateForInput, formatTimeForInput } from "~/utils/date";
import {
  getFieldError,
  getFieldErrorClassName,
  isUnauthorizedError,
} from "~/utils/formik";
import { sessionFormSchema } from "../session-form-schema";

interface UpdateSessionFormProps {
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
  isPending?: boolean;
  serverError?: ServerError;
}

export const UpdateSessionForm: React.FC<UpdateSessionFormProps> = ({
  initialValues,
  onSubmit,
  isPending = false,
  serverError,
}) => {
  // Safely format dates, ensuring we have valid values
  // Use useMemo to recalculate when initialValues change
  const formattedInitialValues = useMemo<SessionFormValues>(() => {
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
  }, [
    initialValues.title,
    initialValues.type,
    initialValues.startTime,
    initialValues.endTime,
    initialValues.priority,
    initialValues.description,
  ]);

  const formik = useFormik<SessionFormValues>({
    initialValues: formattedInitialValues,
    validate: (values: SessionFormValues) => {
      const result = sessionFormSchema.safeParse(values);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          const path = issue.path
            .map((p) => (typeof p === "string" ? p : String(p)))
            .join(".");
          if (path && !errors[path]) {
            errors[path] = issue.message;
          }
        });
        return errors;
      }
      return {};
    },
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: (values) => {
      // Combine date and time strings into ISO format
      const startDateTime = `${values.startDate}T${values.startTime}:00`;
      const endDateTime = `${values.endDate}T${values.endTime}:00`;

      // Create Date objects - JavaScript will interpret these in local timezone
      const startTimeDate = new Date(startDateTime);
      const endTimeDate = new Date(endDateTime);

      // Validate dates before submitting
      if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
        // Dates are invalid, don't submit
        return;
      }

      onSubmit({
        title: values.title,
        type: values.type as SessionType | undefined,
        startTime: startTimeDate,
        endTime: endTimeDate,
        priority: values.priority,
        description: values.description ?? undefined,
      });
    },
    enableReinitialize: true,
  });

  // Helper to get field error using centralized utility
  const getFieldErrorForField = (
    fieldName: keyof SessionFormValues,
  ): string | undefined => {
    return getFieldError(
      fieldName,
      formik.errors,
      formik.submitCount,
      serverError,
    );
  };

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
            formik.errors,
            formik.submitCount,
            serverError,
          )}`}
          value={formik.values.title}
          onChangeText={formik.handleChange("title")}
          onBlur={formik.handleBlur("title")}
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
          {Object.values(SESSION_TYPES_DISPLAY).map((sessionType) => (
            <Pressable
              key={sessionType.value}
              onPress={() => formik.setFieldValue("type", sessionType.value)}
              className={`rounded-md border px-3 py-2 ${
                formik.values.type === sessionType.value
                  ? "bg-primary border-primary"
                  : "border-input bg-background"
              }`}
            >
              <Text
                className={
                  formik.values.type === sessionType.value
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
          {[1, 2, 3, 4, 5].map((priority) => (
            <Pressable
              key={priority}
              onPress={() => formik.setFieldValue("priority", priority)}
              className={`flex-1 rounded-md border px-3 py-2 ${
                formik.values.priority === priority
                  ? "bg-primary border-primary"
                  : "border-input bg-background"
              }`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  formik.values.priority === priority
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
                formik.errors,
                formik.submitCount,
                serverError,
              )}`}
              value={formik.values.startDate}
              onChangeText={formik.handleChange("startDate")}
              onBlur={formik.handleBlur("startDate")}
              placeholder="YYYY-MM-DD"
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
                formik.errors,
                formik.submitCount,
                serverError,
              )}`}
              value={formik.values.startTime}
              onChangeText={formik.handleChange("startTime")}
              onBlur={formik.handleBlur("startTime")}
              placeholder="HH:mm"
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
                formik.errors,
                formik.submitCount,
                serverError,
              )}`}
              value={formik.values.endDate}
              onChangeText={formik.handleChange("endDate")}
              onBlur={formik.handleBlur("endDate")}
              placeholder="YYYY-MM-DD"
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
                formik.errors,
                formik.submitCount,
                serverError,
              )}`}
              value={formik.values.endTime}
              onChangeText={formik.handleChange("endTime")}
              onBlur={formik.handleBlur("endTime")}
              placeholder="HH:mm"
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
          value={formik.values.description}
          onChangeText={formik.handleChange("description")}
          onBlur={formik.handleBlur("description")}
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
          You need to be logged in to update a session
        </Text>
      )}

      <Pressable
        onPress={() => formik.handleSubmit()}
        disabled={isPending}
        className={`rounded-md px-4 py-3 ${
          !isPending ? "bg-primary" : "bg-muted opacity-50"
        }`}
      >
        <Text
          className={`text-center text-base font-semibold ${
            !isPending ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {isPending ? "Updating..." : "Update Session"}
        </Text>
      </Pressable>
    </ScrollView>
  );
};
