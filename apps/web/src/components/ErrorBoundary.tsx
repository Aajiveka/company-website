import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unhandled errors in the React tree and renders a fallback UI
 * instead of a blank screen. Logs the error for debugging.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <section className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <p className="font-heading text-7xl font-bold text-primary">500</p>
          <h1 className="mt-2 font-heading text-2xl font-semibold text-navy">Something went wrong</h1>
          <p className="mt-2 max-w-md text-gray-500">
            An unexpected error occurred. Please try again or return to the home page.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-red-50 p-4 text-left text-xs text-red-700">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex gap-3">
            <button
              onClick={this.reset}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-navy transition hover:bg-gray-50"
            >
              Back to home
            </a>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
