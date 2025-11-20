/**
 * Simple logger utility for API logging
 * Provides structured logging with levels and environment-based filtering
 * Automatically includes requestId from AsyncLocalStorage if available
 */

import { getRequestIdFromContext } from "./tracking/request-context";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  requestId?: string; // Optional request ID for tracing
}

/**
 * Log level hierarchy (higher number = more important)
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Get minimum log level based on environment
 * In production, only log warnings and errors
 * In development, log everything including debug
 */
function getMinLogLevel(): LogLevel {
  const env = process.env.NODE_ENV ?? "development";
  return env === "production" ? "warn" : "debug";
}

const minLogLevel = getMinLogLevel();
const minLogLevelValue = LOG_LEVELS[minLogLevel];

/**
 * Check if a log level should be output based on current minimum log level
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= minLogLevelValue;
}

/**
 * Format log entry as structured JSON (for production log aggregation)
 */
function formatLogEntryAsJSON(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Format log entry as human-readable string (for development)
 */
function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp;
  const level = entry.level.toUpperCase().padEnd(5);
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
  return `[${timestamp}] [${level}] ${entry.message}${dataStr}`;
}

/**
 * Check if structured JSON logging should be used
 * Set LOG_FORMAT=json environment variable to enable JSON logging
 */
function useStructuredLogging(): boolean {
  return process.env.LOG_FORMAT === "json";
}

function createLogger(level: LogLevel) {
  return (
    message: string,
    data?: Record<string, unknown> & { requestId?: string },
  ) => {
    // Skip logging if level is below minimum
    if (!shouldLog(level)) {
      return;
    }

    // Get requestId from data parameter or AsyncLocalStorage
    // Use fallback to "unknown" if not available (defensive check)
    const requestId = data?.requestId ?? getRequestIdFromContext() ?? "unknown";

    // Remove requestId from data if it was passed in
    const { requestId: _requestId, ...logData } = data ?? {};

    const entry: LogEntry = {
      level,
      message,
      data: logData,
      timestamp: new Date().toISOString(),
      requestId,
    };

    const formatted = useStructuredLogging()
      ? formatLogEntryAsJSON(entry)
      : formatLogEntry(entry);

    switch (level) {
      case "debug":
      case "info":
        console.log(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  };
}

export const logger = {
  debug: createLogger("debug"),
  info: createLogger("info"),
  warn: createLogger("warn"),
  error: createLogger("error"),
};
