import { Component, type ErrorInfo, type ReactNode } from "react";

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
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0c1324] p-4">
          <div className="max-w-md w-full bg-[#191f31] border border-[#1e293b] rounded-[6px] shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20 mx-auto flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              An unexpected rendering error occurred in the application.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-[#0c1324] border border-[#1e293b] rounded text-left text-xs font-mono text-[#f43f5e] overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full inline-flex justify-center items-center px-4 py-2 bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#020617] font-semibold rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#38bdf8] transition-colors text-sm"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
