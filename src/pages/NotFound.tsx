import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 - route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <span className="font-display text-6xl font-black tracking-tighter text-accent mb-4">404</span>
      <h1 className="text-xl font-bold text-foreground mb-2">Page not found</h1>
      <p className="text-sm text-muted-foreground mb-8">
        <code className="px-1.5 py-0.5 rounded bg-muted text-accent font-mono">{location.pathname}</code>{" "}
        doesn't exist in the admin panel.
      </p>
      <Button asChild className="gap-2">
        <Link to="/">
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;
