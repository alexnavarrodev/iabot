// Last-line-of-defense error boundary. Wraps the route Suspense so any
// uncaught render error shows a styled fallback instead of a blank page.
//
// Class component because React still requires that for componentDidCatch.

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console so devs see the stack trace + component stack.
    // In production we could ship this to Sentry / a backend log endpoint.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="max-w-lg w-full bg-bg-elevated border border-danger/40 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="size-6 text-danger shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-danger">
                  Something went wrong rendering this page
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  The bot itself is unaffected — only the dashboard render failed.
                </p>
              </div>
            </div>
            <div className="bg-bg-base border border-border-subtle rounded p-3 mb-4">
              <code className="text-2xs text-text-secondary font-mono break-all">
                {this.state.error.message}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ error: null });
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-bg-base text-sm font-medium hover:bg-primary-strong transition-colors"
              >
                <RotateCcw className="size-4" />
                Reload page
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ error: null });
                  window.history.back();
                }}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-text-secondary hover:bg-bg-muted hover:text-text-primary text-sm font-medium transition-colors"
              >
                Go back
              </button>
            </div>
            <p className="text-2xs text-text-muted mt-4">
              Stack trace logged to the browser console.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
