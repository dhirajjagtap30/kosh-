import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";

/* "Schedule my demo" form on the public website. */
export const leadService = {
  submitDemoRequest: async ({ name, institute, phone, need }) => {
    await api.post(ENDPOINTS.leads.demoRequest, { name, institute, phone, need });
  },
};
