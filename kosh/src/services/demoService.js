import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";

/* Only meaningful for the mock API / a development backend. */
export const demoService = {
  reset: async () => { await api.post(ENDPOINTS.demo.reset); },
};
