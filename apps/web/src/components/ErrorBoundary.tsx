import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { captureError } from '@/lib/errorTracking';

interface Props {
  fallback: ReactNode | ((error: Error) => ReactNode);
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Class-based error boundary — catches render errors in its subtree and
 * displays a fallback UI instead of a white screen.
 *
 * Prefer the router's `errorElement` for route-level errors. Use this
 * component to wrap specific widgets that shouldn't crash the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { componentStack: info.componentStack ?? undefined });
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      return typeof fallback === 'function' ? fallback(this.state.error) : fallback;
    }
    return this.props.children;
  }
}
