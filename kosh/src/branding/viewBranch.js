/* Super admin only: which branch the dashboard is looking at (0 = all branches). Sent to the API as the X-Branch-Id header. */
const KEY = "kosh-view-branch";
export const getViewBranch = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };
export const setViewBranch = (id) => { try { if (id) localStorage.setItem(KEY, String(id)); else localStorage.removeItem(KEY); } catch { /* ignore */ } };
