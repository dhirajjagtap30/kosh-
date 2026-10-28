import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LOGIN_PATH } from "./users";
import { SESSION_KEY, readSession, writeSession, clearSession } from "./session";
import { authService, AUTH_EXPIRED_EVENT } from "../services";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);

  // keep tabs in sync (logout in one tab logs out the others)
  useEffect(() => {
    const onStorage = (e) => { if (e.key === SESSION_KEY) setUser(readSession()); };
    // the API client fires this when the server answers 401 (token expired/invalid)
    const onExpired = () => setUser(null);
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    };
  }, []);

  /* Resolves to { ok:true, user } or { ok:false, error } (same as before). */
  const login = useCallback(async (identifier, password) => {
    const res = await authService.login(identifier, password);
    if (res.ok) {
      writeSession(res.user, res.token);
      setUser(res.user);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    authService.logout(); // fire-and-forget; needs the token, so it runs before the session is cleared
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/* Route guard: only the given role (or one of the given roles) may see the children. */
export function RequireRole({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user || ![].concat(role).includes(user.role)) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />;
  }
  return children;
}
