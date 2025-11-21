import type { FieldErrors } from "react-hook-form";

/**
 * Form utilities for working with React Hook Form
 * Centralized helpers for error handling, validation, and form state
 */

/**
 * Server error structure from tRPC mutations
 */
export interface ServerError {
  data?: {
    zodError?: {
      fieldErrors?: Record<string, string[]>;
    };
    code?: string;
  };
}

/**
 * Get field error combining React Hook Form errors and server errors
 * Only shows form validation errors after form has been submitted at least once
 * Server errors are always shown
 *
 * @param fieldName - The name of the form field
 * @param formErrors - React Hook Form's errors object
 * @param isSubmitted - Whether the form has been submitted
 * @param serverError - Optional server error from mutation
 * @returns The error message for the field, or undefined if no error
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
 *
 * @param fieldName - The name of the form field
 * @param formErrors - React Hook Form's errors object
 * @param isSubmitted - Whether the form has been submitted
 * @param serverError - Optional server error from mutation
 * @returns True if the field has an error
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
 *
 * @param fieldName - The name of the form field
 * @param formErrors - React Hook Form's errors object
 * @param isSubmitted - Whether the form has been submitted
 * @param serverError - Optional server error from mutation
 * @returns CSS class name for error styling
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
 *
 * @param formErrors - React Hook Form's errors object
 * @param serverError - Optional server error from mutation
 * @returns True if form has any errors
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
 *
 * @param serverError - Optional server error from mutation
 * @returns True if error indicates unauthorized access
 */
export const isUnauthorizedError = (serverError?: ServerError): boolean => {
  return serverError?.data?.code === "UNAUTHORIZED";
};

/**
 * Get all field errors as a flat object
 * Useful for displaying all errors at once
 *
 * @param formErrors - React Hook Form's errors object
 * @param isSubmitted - Whether the form has been submitted
 * @param serverError - Optional server error from mutation
 * @returns Object with all field errors
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
        errors[key] = String(value.message);
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
 *
 * @param mutationError - The error from tRPC mutation (can be null or undefined)
 * @returns ServerError format or undefined if no error
 */
export const transformMutationError = (
  mutationError:
    | {
        data?: {
          zodError?: {
            fieldErrors?: Record<string, string[] | undefined>;
          } | null;
          code?: string;
        } | null;
      }
    | null
    | undefined,
): ServerError | undefined => {
  if (!mutationError?.data) {
    return undefined;
  }

  return {
    data: {
      zodError: mutationError.data.zodError
        ? {
            fieldErrors: Object.fromEntries(
              Object.entries(
                mutationError.data.zodError.fieldErrors ?? {},
              ).filter(([, value]) => Array.isArray(value)),
            ) as Record<string, string[]>,
          }
        : undefined,
      code: mutationError.data.code,
    },
  };
};

