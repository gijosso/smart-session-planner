/**
 * Hook for showing toast notifications
 * Provides easy access to toast functions within components
 */

import { useCallback } from "react";

import type { ShowToastOptions, ToastType } from "~/utils/toast";
import {
  hideToast,
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showToast,
} from "~/utils/toast";

/**
 * Hook that provides toast notification functions
 * Use this hook in components to show toast messages
 *
 * @example
 * ```tsx
 * const toast = useToast();
 *
 * toast.success("Session created successfully!");
 * toast.error("Failed to create session");
 * ```
 */
export function useToast() {
  const success = useCallback(
    (
      message: string,
      title?: string,
      options?: Omit<ShowToastOptions, "type" | "message" | "title">,
    ) => {
      showSuccessToast(message, title, options);
    },
    [],
  );

  const error = useCallback(
    (
      message: string,
      title?: string,
      options?: Omit<ShowToastOptions, "type" | "message" | "title">,
    ) => {
      showErrorToast(message, title, options);
    },
    [],
  );

  const info = useCallback(
    (
      message: string,
      title?: string,
      options?: Omit<ShowToastOptions, "type" | "message" | "title">,
    ) => {
      showInfoToast(message, title, options);
    },
    [],
  );

  const show = useCallback((options: ShowToastOptions) => {
    showToast(options);
  }, []);

  const hide = useCallback(() => {
    hideToast();
  }, []);

  return {
    success,
    error,
    info,
    show,
    hide,
  };
}


