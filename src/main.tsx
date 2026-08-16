import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/electrolize/400.css";
import "@fontsource/orbitron/400.css";
import "@fontsource/orbitron/700.css";
import App from "@/App";
import "@/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
