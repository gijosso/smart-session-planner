import type React from "react";
import { Text, View } from "react-native";
import type { FieldErrors } from "react-hook-form";

import type { ServerError } from "~/utils/form";
import { getFieldError } from "~/utils/form";

interface FormFieldProps {
  label: string;
  required?: boolean;
  fieldName: string;
  errors: FieldErrors;
  isSubmitted: boolean;
  serverError?: ServerError;
  children: React.ReactNode;
  errorMessage?: string;
}

/**
 * Base form field component with label and error handling
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  fieldName,
  errors,
  isSubmitted,
  serverError,
  children,
  errorMessage,
}) => {
  const fieldError =
    errorMessage ??
    getFieldError(fieldName, errors, isSubmitted, serverError);

  return (
    <View>
      <Text className="text-foreground mb-2 text-sm font-medium">
        {label}
        {required && " *"}
      </Text>
      {children}
      {fieldError && (
        <Text className="text-destructive mt-1 text-sm">{fieldError}</Text>
      )}
    </View>
  );
};

