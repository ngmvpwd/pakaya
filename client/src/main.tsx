import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initConsoleErrorFilter } from "./lib/console-error-filter";

// Initialize console error filter to suppress WebSocket development errors
initConsoleErrorFilter();

createRoot(document.getElementById("root")!).render(<App />);
