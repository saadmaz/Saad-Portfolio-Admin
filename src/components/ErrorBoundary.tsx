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
          <div className="bg-destructive/10 p-4 rounded-full mb-6">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-4 text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            An unexpected error occurred while rendering this page.
            {this.state.error && (
              <span className="block mt-2 font-mono text-sm bg-secondary p-2 rounded text-left overflow-auto max-w-full">
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
