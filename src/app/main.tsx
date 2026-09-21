import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./index.css";

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(<App />);
