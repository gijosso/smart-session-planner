import type React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFormik } from "formik";

import type { SessionFormValues } from "./session-form-schema";
import { sessionFormSchema } from "./session-form-schema";

const SESSION_TYPES = [
  "Deep Work",
  "Workout",
  "Language",
  "Meditation",
  "Client Meeting",
  "Study",
  "Reading",
  "Other",
] as const;

interface CreateSessionFormProps {
  onSubmit: (values: {
    title: string;
    type: string;
    startTime: Date;
    endTime: Date;
    description?: string;
  }) => void;
  isPending?: boolean;
  serverError?: {
    data?: {
      zodError?: {
        fieldErrors?: Record<string, string[]>;
      };
      code?: string;
    };
  };
}

// Get today's date in YYYY-MM-DD format for default values
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Get current time in HH:mm format for default values
const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

export const CreateSessionForm: React.FC<CreateSessionFormProps> = ({
  onSubmit,
  isPending = false,
  serverError,
}) => {
  const formik = useFormik<SessionFormValues>({
    initialValues: {
      title: "",
      type: "",
      startDate: getTodayDate() ?? "",
      startTime: getCurrentTime(),
      endDate: getTodayDate() ?? "",
      endTime: getCurrentTime(),
      description: "",
    },
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

      onSubmit({
        title: values.title,
        type: values.type,
        startTime: startTimeDate,
        endTime: endTimeDate,
        description: values.description ?? undefined,
      });
    },
    enableReinitialize: true,
  });

  // Combine server errors with formik errors
  // Only show form validation errors after form has been submitted at least once
  // Server errors are always shown
  const getFieldError = (
    fieldName: keyof SessionFormValues,
  ): string | undefined => {
    // Server errors are always shown
    const serverErrorMsg =
      serverError?.data?.zodError?.fieldErrors?.[fieldName]?.[0];

    // Form validation errors only show after first submit attempt
    const formError =
      formik.submitCount > 0 ? formik.errors[fieldName] : undefined;

    return serverErrorMsg ?? formError;
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
          className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${
            getFieldError("title") ? "border-destructive" : ""
          }`}
          value={formik.values.title}
          onChangeText={formik.handleChange("title")}
          onBlur={formik.handleBlur("title")}
          placeholder="e.g., Morning Meditation"
          maxLength={256}
        />
        {getFieldError("title") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldError("title")}
          </Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-foreground mb-2 text-sm font-medium">Type *</Text>
        <View className="flex flex-row flex-wrap gap-2">
          {SESSION_TYPES.map((sessionType) => (
            <Pressable
              key={sessionType}
              onPress={() => formik.setFieldValue("type", sessionType)}
              className={`rounded-md border px-3 py-2 ${
                formik.values.type === sessionType
                  ? "bg-primary border-primary"
                  : "border-input bg-background"
              }`}
            >
              <Text
                className={
                  formik.values.type === sessionType
                    ? "text-primary-foreground text-sm font-medium"
                    : "text-foreground text-sm"
                }
              >
                {sessionType}
              </Text>
            </Pressable>
          ))}
        </View>
        {getFieldError("type") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldError("type")}
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
              className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${
                getFieldError("startDate") ? "border-destructive" : ""
              }`}
              value={formik.values.startDate}
              onChangeText={formik.handleChange("startDate")}
              onBlur={formik.handleBlur("startDate")}
              placeholder={getTodayDate()}
              placeholderTextColor="#71717A"
            />
            <Text className="text-muted-foreground mt-1 text-xs">
              Format: YYYY-MM-DD
            </Text>
          </View>
          <View className="flex-1">
            <TextInput
              className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${
                getFieldError("startTime") ? "border-destructive" : ""
              }`}
              value={formik.values.startTime}
              onChangeText={formik.handleChange("startTime")}
              onBlur={formik.handleBlur("startTime")}
              placeholder={getCurrentTime()}
              placeholderTextColor="#71717A"
            />
            <Text className="text-muted-foreground mt-1 text-xs">
              Format: HH:mm (24h)
            </Text>
          </View>
        </View>
        {(getFieldError("startDate") ?? getFieldError("startTime")) && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldError("startDate") ?? getFieldError("startTime")}
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
              className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${
                getFieldError("endDate") ? "border-destructive" : ""
              }`}
              value={formik.values.endDate}
              onChangeText={formik.handleChange("endDate")}
              onBlur={formik.handleBlur("endDate")}
              placeholder={getTodayDate()}
              placeholderTextColor="#71717A"
            />
            <Text className="text-muted-foreground mt-1 text-xs">
              Format: YYYY-MM-DD
            </Text>
          </View>
          <View className="flex-1">
            <TextInput
              className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${
                getFieldError("endTime") ? "border-destructive" : ""
              }`}
              value={formik.values.endTime}
              onChangeText={formik.handleChange("endTime")}
              onBlur={formik.handleBlur("endTime")}
              placeholder={getCurrentTime()}
              placeholderTextColor="#71717A"
            />
            <Text className="text-muted-foreground mt-1 text-xs">
              Format: HH:mm (24h)
            </Text>
          </View>
        </View>
        {(getFieldError("endDate") ?? getFieldError("endTime")) && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldError("endDate") ?? getFieldError("endTime")}
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
        {getFieldError("description") && (
          <Text className="text-destructive mt-1 text-sm">
            {getFieldError("description")}
          </Text>
        )}
      </View>

      {serverError?.data?.code === "UNAUTHORIZED" && (
        <Text className="text-destructive mb-4 text-center">
          You need to be logged in to create a session
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
          {isPending ? "Creating..." : "Create Session"}
        </Text>
      </Pressable>
    </ScrollView>
  );
};
