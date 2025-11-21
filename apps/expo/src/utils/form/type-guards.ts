import type { FieldErrors } from "react-hook-form";

/**
 * Server error structure from tRPC mutations
 * Matches the ServerError interface from form.ts
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
 * Type guard to check if an object is a ServerError
 * Validates the structure matches the ServerError interface
 */
export function isServerError(error: unknown): error is ServerError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as Record<string, unknown>;

  // Check if it has a data property
  if (
    !("data" in candidate) ||
    candidate.data === null ||
    candidate.data === undefined
  ) {
    return false;
  }

  const data = candidate.data as Record<string, unknown>;

  // Check if data has zodError or code properties
  if (!("zodError" in data) && !("code" in data)) {
    return false;
  }

  // If zodError exists, validate its structure
  if ("zodError" in data && data.zodError) {
    const zodError = data.zodError as Record<string, unknown>;
    if (
      !("fieldErrors" in zodError) ||
      !zodError.fieldErrors ||
      typeof zodError.fieldErrors !== "object"
    ) {
      return false;
    }

    // Validate fieldErrors is a Record<string, string[]>
    const fieldErrors = zodError.fieldErrors as Record<string, unknown>;
    for (const value of Object.values(fieldErrors)) {
      if (
        !Array.isArray(value) ||
        !value.every((item) => typeof item === "string")
      ) {
        return false;
      }
    }
  }

  // If code exists, validate it's a string
  if (
    "code" in data &&
    data.code !== undefined &&
    typeof data.code !== "string"
  ) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if an object is FieldErrors
 * Validates the structure matches React Hook Form's FieldErrors type
 */
export function isFieldErrors<T extends Record<string, unknown>>(
  errors: unknown,
): errors is FieldErrors<T> {
  if (!errors || typeof errors !== "object") {
    return false;
  }

  // FieldErrors is a Record where values can be FieldError objects
  const candidate = errors as Record<string, unknown>;

  // Check if all values are either FieldError objects or nested FieldErrors
  for (const value of Object.values(candidate)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "object") {
      // Check if it's a nested FieldErrors (for nested forms)
      if (isFieldErrors(value)) {
        continue;
      }

      // Check if it's a FieldError object (has message or type property)
      const fieldError = value as Record<string, unknown>;
      if (
        !("message" in fieldError) &&
        !("type" in fieldError) &&
        !("ref" in fieldError)
      ) {
        // If it doesn't have any FieldError properties, it's not a valid FieldError
        // But it could be a nested object, so we'll be lenient
        continue;
      }
    } else {
      // FieldError values should be objects, not primitives
      return false;
    }
  }

  return true;
}

/**
 * Type guard to check if an error has zodError fieldErrors
 * More specific than isServerError - checks for validation errors specifically
 */
export function isValidationError(error: unknown): error is ServerError & {
  data: {
    zodError: {
      fieldErrors: Record<string, string[]>;
    };
  };
} {
  if (!isServerError(error)) {
    return false;
  }

  return !!(
    error.data?.zodError?.fieldErrors &&
    typeof error.data.zodError.fieldErrors === "object" &&
    Object.keys(error.data.zodError.fieldErrors).length > 0
  );
}

/**
 * Type guard to check if an error is a tRPC error with zodError
 * Validates the structure matches tRPC's error format
 */
export function isTRPCZodError(error: unknown): error is {
  data?: {
    zodError?: {
      fieldErrors?: Record<string, string[] | undefined>;
    } | null;
    code?: string;
  } | null;
} {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as Record<string, unknown>;

  if (!("data" in candidate)) {
    return false;
  }

  const data = candidate.data as Record<string, unknown> | null | undefined;

  if (!data || typeof data !== "object") {
    return false;
  }

  // Check if it has zodError or code
  if (!("zodError" in data) && !("code" in data)) {
    return false;
  }

  return true;
}
