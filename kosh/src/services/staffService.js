import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";
import { listAll } from "./api/helpers";
import { staffFromApi } from "./mappers";

/* Staff / trainer accounts — created by the admin, who chooses their login ID and password. Admin-only endpoints. */
export const staffService = {
  list: async () => (await listAll(ENDPOINTS.staff.list)).map(staffFromApi),
  create: async ({ name, role, mobile, email, username, password }) =>
    staffFromApi((await api.post(ENDPOINTS.staff.list, { name, role, mobile, email, username, password })).data),
  update: async (id, f) => staffFromApi((await api.patch(ENDPOINTS.staff.detail(id), f)).data),
  remove: async (id) => { await api.delete(ENDPOINTS.staff.detail(id)); },
};
