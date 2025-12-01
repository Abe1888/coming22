/**
 * Custom Error Classes
 * 
 * Provides specialized error types with context for better debugging
 * and error handling in production.
 * 
 * All errors include:
 * - Descriptive message
 * - Context object with relevant data
 * - Stack trace
 * - Error type identification
 */

/**
 * Base error class with context
 */
export class ContextError extends Error {
  public context: Record<string, any>;
  public timestamp: number;

  constructor(message: string, context: Record<string, any> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get formatted error information
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: new Date(this.timestamp).toISOString(),
      stack: this.stack
    };
  }

  /**
   * Get formatted error string
   */
  toString(): string {
    return `${this.name}: ${this.message}\nContext: ${JSON.stringify(this.context, null, 2)}`;
  }
}

/**
 * Asset loading error
 * Thrown when assets fail to load
 */
export class AssetLoadError extends ContextError {
  constructor(
    message: string,
    context: {
      assetName: string;
      assetType?: 'glb' | 'texture' | 'audio' | 'other';
      attempts?: number;
      originalError?: Error;
      [key: string]: any;
    }
  ) {
    super(message, context);
  }
}

/**
 * Build validation error
 * Thrown when build validation checks fail
 */
export class BuildValidationError extends ContextError {
  constructor(
    message: string,
    context: {
      validationType: 'checksum' | 'compression' | 'bundle' | 'other';
      failedChecks: string[];
      [key: string]: any;
    }
  ) {
    super(message, context);
  }
}

/**
 * Transform validation error
 * Thrown when object transforms don't match expected values
 */
export class TransformValidationError extends ContextError {
  constructor(
    message: string,
    context: {
      objectName: string;
      expected: any;
      actual: any;
      tolerance?: number;
      [key: string]: any;
    }
  ) {
    super(message, context);
  }
}

/**
 * WebGL context error
 * Thrown when WebGL context is lost or fails to initialize
 */
export class WebGLContextError extends ContextError {
  constructor(
    message: string,
    context: {
      contextType: 'lost' | 'creation-failed' | 'not-supported';
      canRecover?: boolean;
      [key: string]: any;
    }
  ) {
    super(message, context);
  }
}

/**
 * Scene initialization error
 * Thrown when scene fails to initialize properly
 */
export class SceneInitializationError extends ContextError {
  constructor(
    message: string,
    context: {
      stage: 'css-loading' | 'scene-creation' | 'asset-loading' | 'transform-application' | 'other';
      [key: string]: any;
    }
  ) {
    super(message, context);
  }
}

/**
 * Decoder initialization error
 * Thrown when Draco/KTX2 decoder fails to initialize
 */
export class DecoderInitializationError extends ContextError {
  constructor(
    message: string,
    context: {
      decoderType: 'draco' | 'ktx2';
      decoderPath?: string;
      [key: string]: any;
    }
  ) {
    super(message, context);
  }
}

/**
 * Configuration error
 * Thrown when configuration is invalid or missing
 */
export class ConfigurationError extends ContextError {
  constructor(
    message: string,
    context: {
      configType: 'transforms' | 'build' | 'scene' | 'other';
      configPath?: string;
      [key: string]: any;
    }
  ) {
    super(message, context);
  }
}

/**
 * Error handler utility
 * Provides consistent error logging and reporting
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ContextError[] = [];
  private maxLogSize: number = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with logging and optional callback
   */
  handle(error: Error | ContextError, callback?: (error: Error | ContextError) => void): void {
    // Log to console
    console.error('🚨 Error occurred:', error);

    // Add to error log if it's a ContextError
    if (error instanceof ContextError) {
      this.errorLog.push(error);

      // Trim log if it exceeds max size
      if (this.errorLog.length > this.maxLogSize) {
        this.errorLog.shift();
      }

      // Log context
      console.error('📋 Error context:', error.context);
    }

    // Log stack trace
    if (error.stack) {
      console.error('📚 Stack trace:', error.stack);
    }

    // Execute callback if provided
    if (callback) {
      callback(error);
    }
  }

  /**
   * Get error log
   */
  getErrorLog(): ContextError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Export error log as JSON
   */
  exportErrorLog(): string {
    return JSON.stringify(
      this.errorLog.map(error => error.toJSON()),
      null,
      2
    );
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    recent: ContextError[];
  } {
    const byType: Record<string, number> = {};

    this.errorLog.forEach(error => {
      byType[error.name] = (byType[error.name] || 0) + 1;
    });

    return {
      total: this.errorLog.length,
      byType,
      recent: this.errorLog.slice(-10)
    };
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * Utility function to check if error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  if (error instanceof WebGLContextError) {
    return error.context.canRecover === true;
  }

  if (error instanceof AssetLoadError) {
    return true; // Asset load errors can be retried
  }

  if (error instanceof DecoderInitializationError) {
    return true; // Can fallback to uncompressed assets
  }

  return false;
}

/**
 * Utility function to get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof AssetLoadError) {
    return `Failed to load ${error.context.assetName}. Please refresh the page.`;
  }

  if (error instanceof WebGLContextError) {
    if (error.context.contextType === 'not-supported') {
      return 'Your browser does not support WebGL. Please use a modern browser.';
    }
    return 'Graphics context was lost. Attempting to recover...';
  }

  if (error instanceof DecoderInitializationError) {
    return 'Loading optimized assets failed. Falling back to standard quality...';
  }

  if (error instanceof SceneInitializationError) {
    return 'Failed to initialize 3D scene. Please refresh the page.';
  }

  return 'An unexpected error occurred. Please refresh the page.';
}

/**
 * Utility function to log error with context
 */
export function logError(
  error: Error,
  additionalContext?: Record<string, any>
): void {
  if (error instanceof ContextError) {
    errorHandler.handle(error);
  } else {
    // Convert regular error to ContextError
    const contextError = new ContextError(error.message, {
      originalError: error,
      ...additionalContext
    });
    errorHandler.handle(contextError);
  }
}
