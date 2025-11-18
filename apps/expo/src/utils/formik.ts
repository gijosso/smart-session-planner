import type { FormikErrors } from "formik";

/**
 * Form utilities for working with Formik forms
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
 * Get field error combining Formik errors and server errors
 * Only shows form validation errors after form has been submitted at least once
 * Server errors are always shown
 *
 * @param fieldName - The name of the form field
 * @param formikErrors - Formik's errors object
 * @param formikSubmitCount - Formik's submit count (number of times form has been submitted)
 * @param serverError - Optional server error from mutation
 * @returns The error message for the field, or undefined if no error
 */
export const getFieldError = <T extends Record<string, unknown>>(
  fieldName: keyof T,
  formikErrors: FormikErrors<T>,
  formikSubmitCount: number,
  serverError?: ServerError,
): string | undefined => {
  // Server errors are always shown
  const serverErrorMsg =
    serverError?.data?.zodError?.fieldErrors?.[fieldName as string]?.[0];

  // Form validation errors only show after first submit attempt
  const formError = formikSubmitCount > 0 ? formikErrors[fieldName] : undefined;

  return serverErrorMsg ?? (formError as string | undefined);
};

/**
 * Check if a field has an error
 * Useful for conditional styling
 *
 * @param fieldName - The name of the form field
 * @param formikErrors - Formik's errors object
 * @param formikSubmitCount - Formik's submit count
 * @param serverError - Optional server error from mutation
 * @returns True if the field has an error
 */
export const hasFieldError = <T extends Record<string, unknown>>(
  fieldName: keyof T,
  formikErrors: FormikErrors<T>,
  formikSubmitCount: number,
  serverError?: ServerError,
): boolean => {
  return (
    getFieldError(fieldName, formikErrors, formikSubmitCount, serverError) !==
    undefined
  );
};

/**
 * Get error class name for a field
 * Returns "border-destructive" if field has error, empty string otherwise
 *
 * @param fieldName - The name of the form field
 * @param formikErrors - Formik's errors object
 * @param formikSubmitCount - Formik's submit count
 * @param serverError - Optional server error from mutation
 * @returns CSS class name for error styling
 */
export const getFieldErrorClassName = <T extends Record<string, unknown>>(
  fieldName: keyof T,
  formikErrors: FormikErrors<T>,
  formikSubmitCount: number,
  serverError?: ServerError,
): string => {
  return hasFieldError(fieldName, formikErrors, formikSubmitCount, serverError)
    ? "border-destructive"
    : "";
};

/**
 * Check if form has any errors
 *
 * @param formikErrors - Formik's errors object
 * @param serverError - Optional server error from mutation
 * @returns True if form has any errors
 */
export const hasFormErrors = <T extends Record<string, unknown>>(
  formikErrors: FormikErrors<T>,
  serverError?: ServerError,
): boolean => {
  // Check Formik errors
  if (Object.keys(formikErrors).length > 0) {
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
 * @param formikErrors - Formik's errors object
 * @param formikSubmitCount - Formik's submit count
 * @param serverError - Optional server error from mutation
 * @returns Object with all field errors
 */
export const getAllFieldErrors = <T extends Record<string, unknown>>(
  formikErrors: FormikErrors<T>,
  formikSubmitCount: number,
  serverError?: ServerError,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Add Formik errors (only if form has been submitted)
  if (formikSubmitCount > 0) {
    Object.entries(formikErrors).forEach(([key, value]) => {
      if (value) {
        errors[key] = typeof value === "string" ? value : String(value);
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
