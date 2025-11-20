/**
 * Simple structured logger
 * In production, replace with proper logging service (e.g., Sentry, DataDog, Winston)
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();

    // In production, send to logging service
    // For now, use console with structured output
    const logMethod = level === "error" ? console.error : console.log;
    logMethod(`[${level.toUpperCase()}] ${timestamp} ${message}`, context);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }
}

export const logger = new Logger();
