import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import { createAppError } from "~/utils/error/types";
import { ErrorScreen } from "./error-screen";

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
  errorInfo?: ErrorInfo;
}

/**
 * Fallback component for error boundary
 */
function ErrorBoundaryFallback({
  error,
  resetError,
}: ErrorBoundaryFallbackProps) {
  const appError = createAppError(error);

  return (
    <ErrorScreen
      error={appError}
      onReset={resetError}
      title="Oops! Something went wrong"
      showDetails={process.env.NODE_ENV === "development"}
    />
  );
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface AppErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: (props: ErrorBoundaryFallbackProps) => ReactNode;
  resetKeys?: (string | number)[];
  onReset?: () => void;
}

/**
 * Custom React Error Boundary implementation
 * Catches JavaScript errors anywhere in the child component tree
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<AppErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging (in production, this should go to an error reporting service)
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    // Reset error boundary when resetKeys change
    const { resetKeys, onReset } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && resetKeys.length > 0) {
        this.resetErrorBoundary();
        onReset?.();
      }
    }
  }

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { children, fallback } = this.props;
    const { hasError, error, errorInfo } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided, otherwise use default
      if (fallback) {
        return fallback({
          error,
          resetError: this.resetErrorBoundary,
          errorInfo: errorInfo ?? undefined,
        });
      }

      return (
        <ErrorBoundaryFallback
          error={error}
          resetError={this.resetErrorBoundary}
          errorInfo={errorInfo ?? undefined}
        />
      );
    }

    return children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 * Uses the class-based ErrorBoundary internally
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps?: Omit<AppErrorBoundaryProps, "children">,
) {
  return function WrappedComponent(props: P) {
    return (
      <AppErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </AppErrorBoundary>
    );
  };
}
