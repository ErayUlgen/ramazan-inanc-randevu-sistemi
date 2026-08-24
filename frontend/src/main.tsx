import { MotionConfig } from "framer-motion";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./design-system/fonts.css";
import "./index.css";
import App from "./App.tsx";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <TooltipProvider delayDuration={300}>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
