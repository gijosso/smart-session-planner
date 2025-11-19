import type React from "react";
import type { z } from "zod";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFormik } from "formik";

import type { DayOfWeek } from "@ssp/api/client";

import type { ServerError } from "~/utils/formik";
import { DAYS_OF_WEEK_DISPLAY } from "~/constants/activity";
import {
  getFieldError,
  getFieldErrorClassName,
  isUnauthorizedError,
} from "~/utils/formik";
import { availabilityFormSchema } from "./availibility-form-schema";

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

interface AvailabilityFormProps {
  onSubmit: (values: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
  }) => void;
  isPending?: boolean;
  serverError?: ServerError;
  initialValues?: {
    dayOfWeek?: DayOfWeek;
    startTime?: string;
    endTime?: string;
  };
}

export const AvailabilityForm: React.FC<AvailabilityFormProps> = ({
  onSubmit,
  isPending = false,
  serverError,
  initialValues,
}) => {
  const formik = useFormik<AvailabilityFormValues>({
    initialValues: {
      dayOfWeek: initialValues?.dayOfWeek ?? "MONDAY",
      startTime: initialValues?.startTime ?? "09:00",
      endTime: initialValues?.endTime ?? "17:00",
    },
    validate: (values: AvailabilityFormValues) => {
      const result = availabilityFormSchema.safeParse(values);
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
      // Convert HH:mm to HH:mm:ss format for API
      onSubmit({
        dayOfWeek: values.dayOfWeek,
        startTime: `${values.startTime}:00`,
        endTime: `${values.endTime}:00`,
      });
    },
    enableReinitialize: true,
  });

  const getFieldErrorForField = (
    fieldName: keyof AvailabilityFormValues,
  ): string | undefined => {
    return getFieldError(
      fieldName,
      formik.errors,
      formik.submitCount,
      serverError,
    );
  };

  return (
    <View className="flex-1 flex-col gap-4">
      <View>
        <Text className="text-foreground mb-2 text-sm font-medium">
          Day of Week *
        </Text>
        <View className="flex flex-row flex-wrap gap-2">
          {Object.values(DAYS_OF_WEEK_DISPLAY).map((day) => (
            <Pressable
              key={day.value}
              onPress={() => formik.setFieldValue("dayOfWeek", day.value)}
              className={`rounded-md border px-3 py-2 ${
                formik.values.dayOfWeek === day.value
                  ? "bg-primary border-primary"
                  : "border-input bg-background"
              }`}
            >
              <Text
                className={
                  formik.values.dayOfWeek === day.value
                    ? "text-primary-foreground text-sm font-medium"
                    : "text-foreground text-sm"
                }
              >
                {day.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {getFieldErrorForField("dayOfWeek") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldErrorForField("dayOfWeek")}
          </Text>
        )}
      </View>

      <View>
        <Text className="text-foreground mb-2 text-sm font-medium">
          Start Time *
        </Text>
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
          placeholder="09:00"
          placeholderTextColor="#71717A"
        />
        <Text className="text-muted-foreground mt-1 text-xs">
          Format: HH:mm (24h)
        </Text>
        {getFieldErrorForField("startTime") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldErrorForField("startTime")}
          </Text>
        )}
      </View>

      <View>
        <Text className="text-foreground mb-2 text-sm font-medium">
          End Time *
        </Text>
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
          placeholder="17:00"
          placeholderTextColor="#71717A"
        />
        <Text className="text-muted-foreground mt-1 text-xs">
          Format: HH:mm (24h)
        </Text>
        {getFieldErrorForField("endTime") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldErrorForField("endTime")}
          </Text>
        )}
      </View>

      {isUnauthorizedError(serverError) && (
        <Text className="text-destructive mb-4 text-center">
          You need to be logged in to manage availability
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
          {isPending ? "Saving..." : initialValues ? "Update" : "Add"}{" "}
          Availability
        </Text>
      </Pressable>
    </View>
  );
};
