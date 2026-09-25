import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root")!;

// App.tsx statically imports the Firebase setup, which now throws at
// module-evaluation time if required VITE_FIREBASE_* env vars are missing
// (see src/lib/firebase.ts). A dynamic import lets us catch that failure
// here and show a real error screen instead of a silent blank page - a
// thrown module-level error happens before React ever mounts, so the
// ErrorBoundary inside <App> can't see it.
import("./App.tsx")
  .then(({ default: App }) => {
    createRoot(rootElement).render(<App />);
  })
  .catch((error: unknown) => {
    console.error("Failed to start app:", error);
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#0a0a0a;color:#e5e5e5;text-align:center;">
        <div style="max-width:480px;">
          <h1 style="font-size:20px;margin-bottom:12px;">App failed to start</h1>
          <p style="color:#999;margin-bottom:16px;">${error instanceof Error ? error.message : "Unknown startup error."}</p>
        </div>
      </div>
    `;
  });
