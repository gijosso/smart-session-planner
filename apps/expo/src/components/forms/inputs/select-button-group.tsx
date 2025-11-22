import type { FieldErrors } from "react-hook-form";
import { Text, View } from "react-native";

import type { ServerError } from "~/utils/form";
import { Button } from "~/components/button";
import { isFieldErrors, isServerError } from "~/utils/form/type-guards";
import { FormField } from "./form-field";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

export interface OptionColors {
  color: string;
  backgroundColor: string;
}

export interface OptionColorClasses {
  borderClass: string;
  textClass: string;
  bgClass: string;
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
  getOptionColor?: (value: T) => OptionColors | undefined;
  getOptionColorClasses?: (value: T) => OptionColorClasses | undefined;
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
  getOptionColor,
  getOptionColorClasses,
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
          const optionColors = getOptionColor?.(option.value);
          const optionColorClasses = getOptionColorClasses?.(option.value);

          // Prefer Tailwind classes over inline styles
          const buttonClassName = isSelected
            ? optionColorClasses
              ? `rounded-md border px-3 py-2 ${optionColorClasses.bgClass} ${optionColorClasses.borderClass}`
              : optionColors
                ? ""
                : "rounded-md border px-3 py-2 bg-primary border-primary"
            : "rounded-md border px-3 py-2 border-input bg-background";

          const textClassName = isSelected
            ? optionColorClasses
              ? `text-sm font-medium ${optionColorClasses.textClass}`
              : optionColors
                ? "text-sm font-medium"
                : "text-sm font-medium text-primary-foreground"
            : "text-sm text-foreground";

          // Fallback to inline styles if classes aren't available
          const buttonStyle =
            isSelected && optionColors && !optionColorClasses
              ? {
                  backgroundColor: optionColors.backgroundColor,
                  borderColor: optionColors.color,
                  borderWidth: 1,
                }
              : undefined;

          const textStyle =
            isSelected && optionColors && !optionColorClasses
              ? { color: optionColors.color }
              : undefined;

          return (
            <Button
              key={String(option.value)}
              variant={
                isSelected && !optionColors && !optionColorClasses
                  ? "default"
                  : "outline"
              }
              onPress={() => onSelect(option.value)}
              className={buttonClassName}
              style={buttonStyle}
              textClassName={
                optionColorClasses || optionColors ? undefined : undefined
              }
            >
              {isSelected && (optionColorClasses || optionColors) ? (
                <Text className={textClassName} style={textStyle}>
                  {option.label}
                </Text>
              ) : (
                option.label
              )}
            </Button>
          );
        })}
      </View>
    </FormField>
  );
}
