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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
      <span className="font-mono text-label uppercase text-accent">Error 404</span>
      <h1 className="mt-4 text-[40px] font-medium leading-none tracking-[-0.03em] text-foreground">
        Page not found<span className="soft">.</span>
      </h1>
      <p className="mt-4 max-w-md text-[15px] text-fg-2">
        <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-foreground">{location.pathname}</code>{" "}
        doesn’t exist in the CMS.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">
          <Home aria-hidden="true" />
          Back to dashboard
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;
