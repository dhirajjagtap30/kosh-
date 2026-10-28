import axios from "axios";
import { env } from "../../config/env";
import { getToken, clearSession, readSession } from "../../auth/session";
import { getViewBranch } from "../../branding/viewBranch";
import { ENDPOINTS } from "./endpoints";
import { normalizeError } from "./errors";

export const AUTH_EXPIRED_EVENT = "param:auth-expired";

const config = {
  baseURL: env.API_BASE_URL,
  timeout: env.API_TIMEOUT,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
};

/* Mock mode: requests never leave the browser; they are answered by src/mocks (loaded on demand).
   The services layer and the UI cannot tell the difference. */
if (env.USE_MOCK) {
  config.adapter = (cfg) => import("../../mocks/mockAdapter").then((m) => m.mockAdapter(cfg));
}

const api = axios.create(config);

api.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) cfg.headers.Authorization = `${env.AUTH_SCHEME} ${token}`;
  const u = readSession(); // a super admin can look at one branch at a time
  if (u && u.role === "superadmin" && getViewBranch()) cfg.headers["X-Branch-Id"] = String(getViewBranch());
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err?.config?.url || "";
    // A 401 on any call except login means the session is no longer valid -> force logout.
    if (err?.response?.status === 401 && !url.includes(ENDPOINTS.auth.login) && getToken()) {
      clearSession();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(normalizeError(err));
  }
);

export default api;
