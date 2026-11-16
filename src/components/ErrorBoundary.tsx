import React from "react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; message: string | null };

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : null;
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-lg text-center">
            <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
            {/* In production a stack trace is noise; in dev it is the only evidence. */}
            {import.meta.env.DEV && this.state.message && (
              <p className="mb-4 break-words rounded border border-destructive/40 bg-destructive/5 p-3 text-left text-xs text-destructive">
                {this.state.message}
              </p>
            )}
            <button
              className="px-4 py-2 rounded bg-primary text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
