import type { FieldErrors } from "react-hook-form";
import { Text, View } from "react-native";

import { Button } from "~/components";
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

  return (
    <FormField
      label={label}
      required={required}
      fieldName={fieldName}
      errors={errors as FieldErrors<Record<string, unknown>>}
      isSubmitted={isSubmitted}
      serverError={
        serverError as
          | { data?: { zodError?: { fieldErrors?: Record<string, string[]> } } }
          | undefined
      }
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
            >
              <Text
                className={
                  isSelected
                    ? "text-primary-foreground text-sm font-medium"
                    : "text-foreground text-sm"
                }
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
