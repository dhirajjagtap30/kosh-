import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";
import { studentPortalFromApi } from "./mappers";

/* Everything the Student Dashboard shows, for the logged-in student (identified by the auth token). */
export const studentPortalService = {
  getDashboard: async () => studentPortalFromApi((await api.get(ENDPOINTS.studentPortal.dashboard)).data),
};
