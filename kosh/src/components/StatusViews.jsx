import "./status-views.css";

/* Small shared loading / error pieces. They reuse the existing blue theme and only appear while data loads or a request fails. */
export function LoadingState({ label = "Loading…", fullPage = false }) {
  return (
    <div className={`api-state${fullPage ? " full" : ""}`} role="status" aria-live="polite">
      <span className="api-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry, fullPage = false }) {
  return (
    <div className={`api-state err${fullPage ? " full" : ""}`} role="alert">
      <b>Something went wrong</b>
      <span>{message || "Please try again."}</span>
      {onRetry && <button type="button" className="kw-btn api-retry" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="api-banner" role="alert">
      <span>{message}</span>
      {onClose && <button type="button" aria-label="Dismiss" onClick={onClose}>✕</button>}
    </div>
  );
}
