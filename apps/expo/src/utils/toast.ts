/**
 * Centralized toast notification utilities
 * Provides a consistent API for showing toast messages throughout the app
 */

import Toast from "react-native-toast-message";

export type ToastType = "success" | "error" | "info";

export interface ShowToastOptions {
  /**
   * Type of toast (success, error, or info)
   * @default "info"
   */
  type?: ToastType;
  /**
   * Title text shown in bold at the top
   */
  title?: string;
  /**
   * Main message text
   */
  message: string;
  /**
   * Duration in milliseconds before auto-hiding
   * @default 3000
   */
  duration?: number;
  /**
   * Position on screen
   * @default "top"
   */
  position?: "top" | "bottom";
  /**
   * Callback when toast is shown
   */
  onShow?: () => void;
  /**
   * Callback when toast is hidden
   */
  onHide?: () => void;
  /**
   * Callback when toast is pressed
   */
  onPress?: () => void;
}

/**
 * Show a toast notification
 * Centralized function for displaying toast messages
 */
export function showToast(options: ShowToastOptions): void {
  const {
    type = "info",
    title,
    message,
    duration = 3000,
    position = "top",
    onShow,
    onHide,
    onPress,
  } = options;

  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: duration,
    position,
    onShow,
    onHide,
    onPress,
  });
}

/**
 * Show a success toast
 * Convenience function for success messages
 */
export function showSuccessToast(
  message: string,
  title?: string,
  options?: Omit<ShowToastOptions, "type" | "message" | "title">,
): void {
  showToast({
    type: "success",
    message,
    title,
    ...options,
  });
}

/**
 * Show an error toast
 * Convenience function for error messages
 */
export function showErrorToast(
  message: string,
  title?: string,
  options?: Omit<ShowToastOptions, "type" | "message" | "title">,
): void {
  showToast({
    type: "error",
    message,
    title: title ?? "Error",
    ...options,
  });
}

/**
 * Show an info toast
 * Convenience function for informational messages
 */
export function showInfoToast(
  message: string,
  title?: string,
  options?: Omit<ShowToastOptions, "type" | "message" | "title">,
): void {
  showToast({
    type: "info",
    message,
    title,
    ...options,
  });
}

/**
 * Hide the currently visible toast
 */
export function hideToast(): void {
  Toast.hide();
}
