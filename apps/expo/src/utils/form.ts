import type { FieldErrors } from "react-hook-form";

import type { ServerError } from "~/utils/form/type-guards";
import { isTRPCZodError } from "~/utils/form/type-guards";

export type { ServerError } from "~/utils/form/type-guards";

/**
 * Get field error combining React Hook Form errors and server errors
 * Only shows form validation errors after form has been submitted at least once
 * Server errors are always shown
 */
export const getFieldError = <T extends Record<string, unknown>>(
  fieldName: keyof T,
  formErrors: FieldErrors<T>,
  isSubmitted: boolean,
  serverError?: ServerError,
): string | undefined => {
  // Server errors are always shown
  const serverErrorMsg =
    serverError?.data?.zodError?.fieldErrors?.[fieldName as string]?.[0];

  // Form validation errors only show after first submit attempt
  const formError = isSubmitted ? formErrors[fieldName]?.message : undefined;

  return serverErrorMsg ?? (formError as string | undefined);
};

/**
 * Check if a field has an error
 * Useful for conditional styling
 */
export const hasFieldError = <T extends Record<string, unknown>>(
  fieldName: keyof T,
  formErrors: FieldErrors<T>,
  isSubmitted: boolean,
  serverError?: ServerError,
): boolean => {
  return (
    getFieldError(fieldName, formErrors, isSubmitted, serverError) !== undefined
  );
};

/**
 * Get error class name for a field
 * Returns "border-destructive" if field has error, empty string otherwise
 */
export const getFieldErrorClassName = <T extends Record<string, unknown>>(
  fieldName: keyof T,
  formErrors: FieldErrors<T>,
  isSubmitted: boolean,
  serverError?: ServerError,
): string => {
  return hasFieldError(fieldName, formErrors, isSubmitted, serverError)
    ? "border-destructive"
    : "";
};

/**
 * Check if form has any errors
 */
export const hasFormErrors = <T extends Record<string, unknown>>(
  formErrors: FieldErrors<T>,
  serverError?: ServerError,
): boolean => {
  // Check form errors
  if (Object.keys(formErrors).length > 0) {
    return true;
  }

  // Check server errors
  if (serverError?.data?.zodError?.fieldErrors) {
    return Object.keys(serverError.data.zodError.fieldErrors).length > 0;
  }

  return false;
};

/**
 * Check if form is in an unauthorized state
 */
export const isUnauthorizedError = (serverError?: ServerError): boolean => {
  return serverError?.data?.code === "UNAUTHORIZED";
};

/**
 * Get all field errors as a flat object
 * Useful for displaying all errors at once
 */
export const getAllFieldErrors = <T extends Record<string, unknown>>(
  formErrors: FieldErrors<T>,
  isSubmitted: boolean,
  serverError?: ServerError,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Add form errors (only if form has been submitted)
  if (isSubmitted) {
    Object.entries(formErrors).forEach(([key, value]) => {
      if (value?.message) {
        errors[key] =
          typeof value.message === "string"
            ? value.message
            : JSON.stringify(value.message);
      }
    });
  }

  // Add server errors (always shown)
  if (serverError?.data?.zodError?.fieldErrors) {
    Object.entries(serverError.data.zodError.fieldErrors).forEach(
      ([key, value]) => {
        if (value.length > 0) {
          errors[key] = value[0] ?? "";
        }
      },
    );
  }

  return errors;
};

/**
 * Transform tRPC mutation error to ServerError format
 * Converts the tRPC error structure to the format expected by form components
 * Uses type guards for safe type checking
 */
export const transformMutationError = (
  mutationError: unknown,
): ServerError | undefined => {
  // Use type guard to validate the error structure
  if (!isTRPCZodError(mutationError) || !mutationError.data) {
    return undefined;
  }

  const data = mutationError.data;

  return {
    data: {
      zodError: data.zodError
        ? {
            fieldErrors: Object.fromEntries(
              Object.entries(data.zodError.fieldErrors ?? {}).filter(
                ([, value]) => Array.isArray(value) && value.length > 0,
              ),
            ) as Record<string, string[]>,
          }
        : undefined,
      code: data.code,
    },
  };
};
