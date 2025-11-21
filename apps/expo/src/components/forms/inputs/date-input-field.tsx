import type React from "react";
import { Text, TextInput, View } from "react-native";
import type { FieldErrors } from "react-hook-form";

import type { ServerError } from "~/utils/form";
import { getFieldErrorClassName } from "~/utils/form";

interface DateInputFieldProps {
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
 * Date input field component with format hint
 * Used standalone or within DateTimeInputGroup
 */
export const DateInputField: React.FC<DateInputFieldProps> = ({
  fieldName,
  value,
  onChangeText,
  placeholder,
  errors,
  isSubmitted,
  serverError,
  formatHint = "Format: YYYY-MM-DD",
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
        key={`date-input-${fieldName}-${errorClassName}`}
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

