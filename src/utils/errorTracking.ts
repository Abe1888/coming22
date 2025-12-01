/**
 * Error Tracking Utility
 * 
 * Centralized error logging and tracking for the 3D application.
 * Captures errors with context and can integrate with external services.
 */

interface ErrorContext {
  component?: string;
  action?: string;
  assetName?: string;
  userAgent?: string;
  timestamp?: number;
  [key: string]: any;
}

interface TrackedError {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTracker {
  private errors: TrackedError[] = [];
  private maxErrors: number = 100; // Keep last 100 errors
  private enabled: boolean = true;

  constructor() {
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      this.setupGlobalHandlers();
    }
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalHandlers(): void {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError(
        event.error || new Error(event.message),
        {
          component: 'Global',
          action: 'Unhandled Error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        'high'
      );
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          component: 'Global',
          action: 'Unhandled Promise Rejection'
        },
        'high'
      );
    });
  }

  /**
   * Track an error with context
   */
  trackError(
    error: Error,
    context: ErrorContext = {},
    severity: TrackedError['severity'] = 'medium'
  ): void {
    if (!this.enabled) return;

    const trackedError: TrackedError = {
      message: error.message,
      stack: error.stack,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      severity
    };

    this.errors.push(trackedError);

    // Keep only the last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`🚨 [${severity.toUpperCase()}] ${error.message}`, {
        context,
        stack: error.stack
      });
    }

    // In production, you could send to an error tracking service
    // Example: Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production' && severity === 'critical') {
      this.sendToErrorService(trackedError);
    }
  }

  /**
   * Track a warning (non-critical error)
   */
  trackWarning(message: string, context: ErrorContext = {}): void {
    this.trackError(new Error(message), context, 'low');
  }

  /**
   * Track an info message
   */
  trackInfo(message: string, context: ErrorContext = {}): void {
    if (process.env.NODE_ENV === 'development') {
      console.info(`ℹ️ ${message}`, context);
    }
  }

  /**
   * Send error to external error tracking service
   * (Placeholder for integration with services like Sentry)
   */
  private sendToErrorService(error: TrackedError): void {
    // Example integration point
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(error.message), {
    //     extra: error.context,
    //     level: error.severity
    //   });
    // }
    
    // For now, just log that we would send it
    console.log('Would send to error service:', error);
  }

  /**
   * Get all tracked errors
   */
  getErrors(): TrackedError[] {
    return [...this.errors];
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: TrackedError['severity']): TrackedError[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Get error summary
   */
  getSummary(): {
    total: number;
    bySeverity: Record<TrackedError['severity'], number>;
    recentErrors: TrackedError[];
  } {
    const bySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.errors.forEach(error => {
      bySeverity[error.severity]++;
    });

    return {
      total: this.errors.length,
      bySeverity,
      recentErrors: this.errors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Export errors as JSON
   */
  exportErrors(): string {
    return JSON.stringify({
      errors: this.errors,
      summary: this.getSummary(),
      timestamp: Date.now()
    }, null, 2);
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Enable/disable error tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// Export types
export type { ErrorContext, TrackedError };
