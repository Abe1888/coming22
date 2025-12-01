/**
 * ThreeJSErrorBoundary - React Error Boundary for 3D Scene
 * 
 * Catches errors in Three.js components and provides:
 * - Graceful fallback UI
 * - Error logging
 * - Retry functionality
 * - User-friendly error messages
 * 
 * @example
 * ```typescript
 * <ThreeJSErrorBoundary>
 *   <Canvas>
 *     <Scene />
 *   </Canvas>
 * </ThreeJSErrorBoundary>
 * ```
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { errorHandler, getUserFriendlyMessage, isRecoverableError } from '../utils/errors';

interface ThreeJSErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ThreeJSErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ThreeJSErrorBoundary extends Component<
  ThreeJSErrorBoundaryProps,
  ThreeJSErrorBoundaryState
> {
  constructor(props: ThreeJSErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ThreeJSErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error
    console.error('🚨 ThreeJS Error Boundary caught an error:', error);
    console.error('📋 Error Info:', errorInfo);

    // Update state
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to error handler
    errorHandler.handle(error);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }

    // Reload page if error persists
    if (this.state.errorCount >= 3) {
      console.warn('⚠️ Multiple errors detected, reloading page...');
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1d2635', // Brand dark
            color: '#ffffff', // Brand white
            fontFamily: 'Inter, sans-serif',
            padding: '20px',
            zIndex: 9999
          }}
        >
          {/* Error Icon */}
          <div
            style={{
              fontSize: '64px',
              marginBottom: '24px',
              animation: 'pulse 2s ease-in-out infinite'
            }}
          >
            ⚠️
          </div>

          {/* Error Title */}
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '16px',
              color: '#be202e', // Brand crimson red
              textAlign: 'center'
            }}
          >
            3D Scene Error
          </h1>

          {/* User-friendly message */}
          <p
            style={{
              fontSize: '18px',
              marginBottom: '24px',
              textAlign: 'center',
              maxWidth: '600px',
              lineHeight: '1.6',
              color: '#b8b8b8' // Brand gray
            }}
          >
            {this.state.error ? getUserFriendlyMessage(this.state.error) : 'An unexpected error occurred.'}
          </p>

          {/* Technical details (collapsible) */}
          {this.state.error && (
            <details
              style={{
                marginBottom: '24px',
                maxWidth: '800px',
                width: '100%',
                backgroundColor: 'rgba(108, 108, 108, 0.2)', // Brand chrome with transparency
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #6c6c6c' // Brand chrome
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                  color: '#ffffff'
                }}
              >
                Technical Details
              </summary>
              <div
                style={{
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#b8b8b8',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#be202e' }}>Error:</strong> {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <div>
                    <strong style={{ color: '#be202e' }}>Stack Trace:</strong>
                    <pre style={{ marginTop: '8px', fontSize: '11px', overflow: 'auto' }}>
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Retry button */}
            {this.state.error && isRecoverableError(this.state.error) && (
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#209771', // Brand emerald green
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#25b085';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#209771';
                }}
              >
                🔄 Try Again
              </button>
            )}

            {/* Reload button */}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#be202e', // Brand crimson red
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#d12a3a';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#be202e';
              }}
            >
              ↻ Reload Page
            </button>

            {/* Home button */}
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '2px solid #6c6c6c', // Brand chrome
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#b8b8b8';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#6c6c6c';
              }}
            >
              🏠 Go Home
            </button>
          </div>

          {/* Error count warning */}
          {this.state.errorCount >= 2 && (
            <div
              style={{
                marginTop: '24px',
                padding: '12px 16px',
                backgroundColor: 'rgba(190, 32, 46, 0.2)', // Brand crimson red with transparency
                border: '1px solid #be202e',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#ffffff',
                textAlign: 'center'
              }}
            >
              ⚠️ Multiple errors detected. The page will reload automatically on the next error.
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: '48px',
              fontSize: '12px',
              color: '#6c6c6c', // Brand chrome
              textAlign: 'center'
            }}
          >
            If this problem persists, please contact support.
          </div>

          {/* Pulse animation */}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.1); }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to use error boundary programmatically
 * 
 * @returns Object with throwError function
 */
export function useErrorBoundary() {
  const throwError = (error: Error) => {
    throw error;
  };

  return { throwError };
}
