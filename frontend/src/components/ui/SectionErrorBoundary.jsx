import { Component } from 'react';

/**
 * Catches render errors in an admin section so one bad state shows a short
 * message with a Reload button instead of blanking the whole screen.
 * Error boundaries must be class components in React.
 */
export default class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Section render failed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="m-6 rounded-xl border border-border bg-card p-8 text-center">
        <h3 className="font-display text-lg font-bold text-foreground">Something went wrong</h3>
        <p className="mt-2 text-sm text-alarm-text">This section hit a problem. Reload to try again.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-5 py-2.5 rounded-xl bg-secondary hover:bg-muted border border-border text-sm font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Reload
        </button>
      </div>
    );
  }
}
