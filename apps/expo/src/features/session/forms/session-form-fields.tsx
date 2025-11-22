import type React from "react";
import type { FieldErrors, UseFormSetValue } from "react-hook-form";
import { Text } from "react-native";

import type { SessionType } from "@ssp/api/client";
import type { SessionFormValues } from "@ssp/validators";

import type { ServerError } from "~/utils/form";
import { CardContent } from "~/components/card/card-content";
import {
  DateTimeInputGroup,
  PrioritySelector,
  SelectButtonGroup,
  TextInputField,
} from "~/components/forms/inputs";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { getCurrentTime, getTodayDate } from "~/utils/date";
import { isUnauthorizedError } from "~/utils/form";

const SESSION_TYPES_ARRAY = Object.values(SESSION_TYPES_DISPLAY);
const SESSION_TYPE_OPTIONS = SESSION_TYPES_ARRAY.map((type) => ({
  value: type.value,
  label: type.label,
}));

export type SessionFormMode = "create" | "update";

interface SessionFormFieldsProps {
  mode: SessionFormMode;
  formValues: Partial<SessionFormValues>;
  errors: FieldErrors<SessionFormValues>;
  isSubmitted: boolean;
  serverError?: ServerError;
  setValue: UseFormSetValue<SessionFormValues>;
}

/**
 * Form fields component for session form
 * Renders all input fields for creating/updating a session
 */
export const SessionFormFields: React.FC<SessionFormFieldsProps> = ({
  mode,
  formValues,
  errors,
  isSubmitted,
  serverError,
  setValue,
}) => {
  const unauthorizedMessage =
    mode === "create"
      ? "You need to be logged in to create a session"
      : "You need to be logged in to update a session";

  return (
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
        getOptionColorClasses={(value) => {
          const sessionTypeMap: Record<
            SessionType,
            { borderClass: string; textClass: string; bgClass: string }
          > = {
            DEEP_WORK: {
              borderClass: "border-session-deep-work",
              textClass: "text-session-deep-work",
              bgClass: "bg-session-deep-work-bg",
            },
            WORKOUT: {
              borderClass: "border-session-workout",
              textClass: "text-session-workout",
              bgClass: "bg-session-workout-bg",
            },
            LANGUAGE: {
              borderClass: "border-session-language",
              textClass: "text-session-language",
              bgClass: "bg-session-language-bg",
            },
            MEDITATION: {
              borderClass: "border-session-meditation",
              textClass: "text-session-meditation",
              bgClass: "bg-session-meditation-bg",
            },
            CLIENT_MEETING: {
              borderClass: "border-session-client-meeting",
              textClass: "text-session-client-meeting",
              bgClass: "bg-session-client-meeting-bg",
            },
            STUDY: {
              borderClass: "border-session-study",
              textClass: "text-session-study",
              bgClass: "bg-session-study-bg",
            },
            READING: {
              borderClass: "border-session-reading",
              textClass: "text-session-reading",
              bgClass: "bg-session-reading-bg",
            },
            OTHER: {
              borderClass: "border-session-other",
              textClass: "text-session-other",
              bgClass: "bg-session-other-bg",
            },
          };
          return sessionTypeMap[value];
        }}
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
  );
};
