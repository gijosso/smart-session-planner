import type React from "react";
import { Text, View } from "react-native";
import type { FieldErrors } from "react-hook-form";

import { Button } from "~/components";
import { PRIORITY_LEVELS } from "~/constants/app";
import type { ServerError } from "~/utils/form";

import { FormField } from "./form-field";

interface PrioritySelectorProps {
  label?: string;
  required?: boolean;
  fieldName: string;
  value: number;
  onChange: (priority: number) => void;
  errors: FieldErrors;
  isSubmitted: boolean;
  serverError?: ServerError;
}

/**
 * Priority selector component for selecting priority level (1-5)
 */
export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  label = "Priority",
  required = false,
  fieldName,
  value,
  onChange,
  errors,
  isSubmitted,
  serverError,
}) => {
  return (
    <FormField
      label={label}
      required={required}
      fieldName={fieldName}
      errors={errors}
      isSubmitted={isSubmitted}
      serverError={serverError}
    >
      <View className="flex flex-row gap-2">
        {PRIORITY_LEVELS.map((priority) => {
          const isSelected = value === priority;
          return (
            <Button
              key={priority}
              variant={isSelected ? "default" : "outline"}
              onPress={() => onChange(priority)}
              className={`flex-1 rounded-md border px-3 py-2 ${
                isSelected
                  ? "bg-primary border-primary"
                  : "border-input bg-background"
              }`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  isSelected ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {priority}
              </Text>
            </Button>
          );
        })}
      </View>
    </FormField>
  );
};

