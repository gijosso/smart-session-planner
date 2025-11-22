import type React from "react";
import type { FieldErrors } from "react-hook-form";
import { TextInput, View } from "react-native";

import type { ServerError } from "~/utils/form";
import { getFieldErrorClassName } from "~/utils/form";
import { FormField } from "./form-field";

interface TextInputFieldProps {
  label: string;
  required?: boolean;
  fieldName: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  errors: FieldErrors;
  isSubmitted: boolean;
  serverError?: ServerError;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  className?: string;
}

/**
 * Text input field component with label, error handling, and styling
 */
export const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  required = false,
  fieldName,
  value,
  onChangeText,
  placeholder,
  errors,
  isSubmitted,
  serverError,
  multiline = false,
  numberOfLines,
  maxLength,
  className = "",
}) => {
  const hasError =
    getFieldErrorClassName(fieldName, errors, isSubmitted, serverError).length >
    0;

  const errorClassName = getFieldErrorClassName(
    fieldName,
    errors,
    isSubmitted,
    serverError,
  );

  const textColor = hasError ? "text-destructive" : "text-foreground";
  const bgColor = hasError ? "bg-destructive/10" : "bg-background";
  const baseClassName = multiline
    ? `border-input ${bgColor} ${textColor} h-24 min-h-24 rounded-md border px-3 py-2 text-base`
    : `border-input ${bgColor} ${textColor} rounded-md border px-3 py-2 text-base`;

  return (
    <FormField
      label={label}
      required={required}
      fieldName={fieldName}
      errors={errors}
      isSubmitted={isSubmitted}
      serverError={serverError}
    >
      <TextInput
        key={`text-input-${fieldName}-${multiline ? "multiline" : "single"}-${errorClassName}-${className}`}
        className={`${baseClassName} ${errorClassName} ${className}`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#71717A"
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? "top" : "center"}
        maxLength={maxLength}
      />
    </FormField>
  );
};
