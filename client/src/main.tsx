import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initViteHMRFix } from "./lib/vite-hmr-fix";

// Initialize Vite HMR fix to suppress WebSocket errors
initViteHMRFix();

createRoot(document.getElementById("root")!).render(<App />);
