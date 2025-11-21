/**
 * Logger utility for consistent error logging across the app
 * In development, logs to console
 * In production, should integrate with error reporting service (e.g., Sentry)
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Log an error message
 * In development: logs to console
 * In production: should send to error reporting service
 */
export const logger = {
  error: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.error(message, ...args);
    }
    // In production, send to error reporting service
    // Example: Sentry.captureException(new Error(message), { extra: args });
  },

  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.warn(message, ...args);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log(message, ...args);
    }
  },
};

