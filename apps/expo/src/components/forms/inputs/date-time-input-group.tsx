import type React from "react";
import type { FieldErrors } from "react-hook-form";
import { Text, TextInput, View } from "react-native";

import type { ServerError } from "~/utils/form";
import { getFieldError, getFieldErrorClassName } from "~/utils/form";

interface DateTimeInputGroupProps {
  label: string;
  required?: boolean;
  dateFieldName: string;
  timeFieldName: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (text: string) => void;
  onTimeChange: (text: string) => void;
  datePlaceholder?: string;
  timePlaceholder?: string;
  errors: FieldErrors;
  isSubmitted: boolean;
  serverError?: ServerError;
}

/**
 * Combined date and time input group component
 */
export const DateTimeInputGroup: React.FC<DateTimeInputGroupProps> = ({
  label,
  required = false,
  dateFieldName,
  timeFieldName,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  datePlaceholder,
  timePlaceholder,
  errors,
  isSubmitted,
  serverError,
}) => {
  const dateError = getFieldError(
    dateFieldName,
    errors,
    isSubmitted,
    serverError,
  );
  const timeError = getFieldError(
    timeFieldName,
    errors,
    isSubmitted,
    serverError,
  );

  const dateErrorClassName = getFieldErrorClassName(
    dateFieldName,
    errors,
    isSubmitted,
    serverError,
  );
  const timeErrorClassName = getFieldErrorClassName(
    timeFieldName,
    errors,
    isSubmitted,
    serverError,
  );

  const dateHasError = dateErrorClassName.length > 0;
  const timeHasError = timeErrorClassName.length > 0;
  const dateTextColor = dateHasError ? "text-destructive" : "text-foreground";
  const timeTextColor = timeHasError ? "text-destructive" : "text-foreground";
  const dateBgColor = dateHasError ? "bg-destructive/10" : "bg-background";
  const timeBgColor = timeHasError ? "bg-destructive/10" : "bg-background";

  const displayError = dateError ?? timeError;

  return (
    <View>
      <Text className="text-foreground mb-2 text-sm font-medium">
        {label}
        {required && " *"}
      </Text>
      <View className="flex flex-row gap-2">
        <View className="flex-1">
          <TextInput
            key={`date-input-${dateFieldName}-${dateErrorClassName}`}
            className={`border-input ${dateBgColor} ${dateTextColor} rounded-md border px-3 py-2 text-base ${dateErrorClassName}`}
            value={dateValue}
            onChangeText={onDateChange}
            placeholder={datePlaceholder}
            placeholderTextColor="#71717A"
          />
          <Text className="text-muted-foreground mt-1 text-xs">
            Format: YYYY-MM-DD
          </Text>
        </View>
        <View className="flex-1">
          <TextInput
            key={`time-input-${timeFieldName}-${timeErrorClassName}`}
            className={`border-input ${timeBgColor} ${timeTextColor} rounded-md border px-3 py-2 text-base ${timeErrorClassName}`}
            value={timeValue}
            onChangeText={onTimeChange}
            placeholder={timePlaceholder}
            placeholderTextColor="#71717A"
          />
          <Text className="text-muted-foreground mt-1 text-xs">
            Format: HH:mm (24h)
          </Text>
        </View>
      </View>
      {displayError && (
        <Text className="text-destructive mt-1 text-sm">{displayError}</Text>
      )}
    </View>
  );
};
