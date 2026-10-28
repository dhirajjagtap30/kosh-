/* Single place that reads environment variables (.env). Nothing else should touch import.meta.env. */
const raw = import.meta.env;

const toBool = (v, fallback) => (v === undefined || v === "" ? fallback : String(v).toLowerCase() === "true");
const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  API_BASE_URL: (raw.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, ""),
  USE_MOCK: toBool(raw.VITE_USE_MOCK, true),
  API_TIMEOUT: toInt(raw.VITE_API_TIMEOUT, 15000),
  AUTH_SCHEME: raw.VITE_AUTH_SCHEME || "Bearer",
  MOCK_DELAY_MS: toInt(raw.VITE_MOCK_DELAY_MS, 250),
};
