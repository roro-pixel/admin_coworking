declare global {
  interface Window {
    global?: Window;
  }
}

if (typeof window !== "undefined" && !window.global) {
  window.global = window;
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./fluid-scale.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
