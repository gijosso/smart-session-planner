import type { FieldErrors } from "react-hook-form";
import { Text, View } from "react-native";

import type { ServerError } from "~/utils/form";
import { Button } from "~/components/button";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { isFieldErrors, isServerError } from "~/utils/form/type-guards";
import { FormField } from "./form-field";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectButtonGroupProps<T extends string | number> {
  label: string;
  required?: boolean;
  fieldName: string;
  value: T;
  options: SelectOption<T>[];
  onSelect: (value: T) => void;
  errors: unknown;
  isSubmitted: boolean;
  serverError?: unknown;
  layout?: "row" | "wrap";
}

/**
 * Select button group component for choosing from multiple options
 */
export function SelectButtonGroup<T extends string | number>({
  label,
  required = false,
  fieldName,
  value,
  options,
  onSelect,
  errors,
  isSubmitted,
  serverError,
  layout = "wrap",
}: SelectButtonGroupProps<T>) {
  const containerClassName =
    layout === "wrap" ? "flex flex-row flex-wrap gap-2" : "flex flex-row gap-2";

  // Use type guards to safely validate error types
  const validatedErrors = isFieldErrors<Record<string, unknown>>(errors)
    ? errors
    : ({} as FieldErrors<Record<string, unknown>>);

  const validatedServerError: ServerError | undefined = isServerError(
    serverError,
  )
    ? serverError
    : undefined;

  return (
    <FormField
      label={label}
      required={required}
      fieldName={fieldName}
      errors={validatedErrors}
      isSubmitted={isSubmitted}
      serverError={validatedServerError}
    >
      <View className={containerClassName}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <Button
              key={String(option.value)}
              variant={isSelected ? "default" : "outline"}
              onPress={() => onSelect(option.value)}
              className={`rounded-md border px-3 py-2 ${
                isSelected
                  ? "bg-primary border-primary"
                  : "border-input bg-background"
              }`}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                padding: 12,
                borderColor: isSelected
                  ? SESSION_TYPES_DISPLAY[
                      option.value as keyof typeof SESSION_TYPES_DISPLAY
                    ].iconColor
                  : "transparent",
                backgroundColor:
                  SESSION_TYPES_DISPLAY[
                    option.value as keyof typeof SESSION_TYPES_DISPLAY
                  ].backgroundColor,
              }}
            >
              <Text
                style={{
                  color:
                    SESSION_TYPES_DISPLAY[
                      option.value as keyof typeof SESSION_TYPES_DISPLAY
                    ].iconColor,
                }}
              >
                {option.label}
              </Text>
            </Button>
          );
        })}
      </View>
    </FormField>
  );
}
