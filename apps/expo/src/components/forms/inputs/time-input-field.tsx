import type React from "react";
import { Text, TextInput, View } from "react-native";
import type { FieldErrors } from "react-hook-form";

import type { ServerError } from "~/utils/form";
import { getFieldErrorClassName } from "~/utils/form";

interface TimeInputFieldProps {
  fieldName: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  errors: FieldErrors;
  isSubmitted: boolean;
  serverError?: ServerError;
  formatHint?: string;
}

/**
 * Time input field component with format hint
 * Used standalone or within DateTimeInputGroup
 */
export const TimeInputField: React.FC<TimeInputFieldProps> = ({
  fieldName,
  value,
  onChangeText,
  placeholder,
  errors,
  isSubmitted,
  serverError,
  formatHint = "Format: HH:mm (24h)",
}) => {
  const errorClassName = getFieldErrorClassName(
    fieldName,
    errors,
    isSubmitted,
    serverError,
  );

  return (
    <View className="flex-1">
      <TextInput
        className={`border-input bg-background text-foreground rounded-md border px-3 py-2 text-base ${errorClassName}`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#71717A"
      />
      <Text className="text-muted-foreground mt-1 text-xs">
        {formatHint}
      </Text>
    </View>
  );
};

