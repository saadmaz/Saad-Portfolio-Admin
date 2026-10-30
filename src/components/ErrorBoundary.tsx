import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
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
    console.error("Uncaught error:", error, errorInfo);
    // Auto-reload when a lazy-loaded chunk fails (stale deployment cache)
    if (error.message?.includes("Failed to fetch dynamically imported module") ||
        error.message?.includes("Importing a module script failed")) {
      window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-subtle">
            <AlertCircle className="h-6 w-6 text-danger-fg" />
          </div>
          <h1 className="mb-3 text-[28px] font-medium tracking-[-0.02em] text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            An unexpected error occurred while rendering this page.
            {this.state.error && (
              <span className="mt-3 block max-w-full overflow-auto rounded-lg bg-secondary p-3 text-left font-mono text-[13px]">
                {this.state.error.message}
              </span>
            )}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
