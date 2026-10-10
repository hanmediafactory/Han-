import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";


interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in HAN app:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="login-screen p-6 text-center">
          <div className="max-w-md mx-auto space-y-6 flex flex-col items-center">
            <div className="bg-page p-3 rounded-2xl border border-border-subtle shadow-xl inline-flex items-center justify-center">
              <img
                src="/logo.png"
                alt="HAN Media Factory"
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="bg-surface-elevated border border-neutral-300 rounded-xl p-6 text-left">
              <h2 className="font-medium text-lg text-text-primary mb-2">Something went wrong</h2>
              <p className="text-sm text-text-secondary mb-4">
                An unexpected error occurred while loading this view. Your saved data is safe.
              </p>
              {this.state.error?.message && (
                <div className="text-xs font-mono bg-neutral-200 p-3 rounded text-text-primary break-words mb-4">
                  {this.state.error.message}
                </div>
              )}
              <button
                onClick={this.handleReset}
                className="w-full py-3 bg-page text-text-primary font-medium rounded-lg text-sm transition hover:bg-neutral-800"
              >
                Reload Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
