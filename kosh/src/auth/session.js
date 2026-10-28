/* Browser session storage (same key and 8-hour lifetime as before). Plain functions so the API client can use it. */
const KEY = "kosh_session";
const TTL = 8 * 60 * 60 * 1000;

export const SESSION_KEY = KEY;

function read() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!s || !s.user || Date.now() > s.expires) { localStorage.removeItem(KEY); return null; }
    return s;
  } catch { return null; }
}

export const readSession = () => (read() || {}).user || null;
export const getToken = () => (read() || {}).token || null;

export function writeSession(user, token) {
  try { localStorage.setItem(KEY, JSON.stringify({ user, token: token || null, expires: Date.now() + TTL })); } catch { /* private mode */ }
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
