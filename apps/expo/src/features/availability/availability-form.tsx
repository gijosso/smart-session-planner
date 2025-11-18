import type React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFormik } from "formik";
import { z } from "zod";

import type { ServerError } from "~/utils/formik";
import {
  getFieldError,
  getFieldErrorClassName,
  isUnauthorizedError,
} from "~/utils/formik";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

const availabilityFormSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:mm format"),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "End time must be in HH:mm format"),
  })
  .refine(
    (data) => {
      const [startHours, startMinutes] = data.startTime.split(":").map(Number);
      const [endHours, endMinutes] = data.endTime.split(":").map(Number);
      const startTotal = (startHours ?? 0) * 60 + (startMinutes ?? 0);
      const endTotal = (endHours ?? 0) * 60 + (endMinutes ?? 0);
      return endTotal > startTotal;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

interface AvailabilityFormProps {
  onSubmit: (values: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) => void;
  isPending?: boolean;
  serverError?: ServerError;
  initialValues?: {
    dayOfWeek?: number;
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
      dayOfWeek: initialValues?.dayOfWeek ?? 1,
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
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={true}
      className="flex-1"
    >
      <View className="mb-4">
        <Text className="text-foreground mb-2 text-sm font-medium">
          Day of Week *
        </Text>
        <View className="flex flex-row flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => (
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

      <View className="mb-4">
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

      <View className="mb-6">
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
    </ScrollView>
  );
};
