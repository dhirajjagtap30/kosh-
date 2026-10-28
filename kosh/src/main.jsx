import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import { AuthProvider } from "./auth/AuthContext";
import { BrandProvider } from "./branding/BrandContext";
import "./theme.css";
import "./effects/effects.css";
import "./glass.css"; // glassmorphism navbar + footer
import "./branding/branding.css"; // white-label colours + dashboard readability (must stay last)

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <BrandProvider><App /></BrandProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
