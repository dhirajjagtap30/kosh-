import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";
import { getErrorMessage } from "./api/errors";
import { userFromApi } from "./mappers";

/* Expected Django response for POST /auth/login/:
   { "access": "<jwt or token>", "user": { "id", "role": "admin|student", "name", "email", "username" } }
   Always resolves to { ok:true, user, token } or { ok:false, error } — never throws. */
export const authService = {
  async login(identifier, password) {
    try {
      const { data } = await api.post(ENDPOINTS.auth.login, { identifier: identifier.trim(), password });
      return { ok: true, user: userFromApi(data.user), token: data.access || data.token || null };
    } catch (e) {
      return { ok: false, error: getErrorMessage(e) };
    }
  },

  /* POST /auth/register/ (student self-registration) -> 201. Resolves { ok:true } or { ok:false, error }. */
  async register(f) {
    try {
      await api.post(ENDPOINTS.auth.register, {
        name: f.name.trim(), mobile: f.mobile.trim(), standard: f.standard, target: f.target || "", branch_id: f.branchId, medium: f.medium, date_of_birth: f.dob,
        email: f.email.trim(), parent_name: f.parentName.trim(), parent_mobile: f.parentMobile.trim(),
        school_name: f.school.trim(), username: f.username.trim(), password: f.password,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: getErrorMessage(e) };
    }
  },

  /* Best effort (e.g. to blacklist a refresh token). Local logout never waits for it or fails because of it. */
  async logout() {
    try { await api.post(ENDPOINTS.auth.logout); } catch { /* ignore */ }
  },
};
