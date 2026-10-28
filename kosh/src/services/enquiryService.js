import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";

/* Public "Enquiries" form. */
export const enquiryService = {
  submit: async ({ name, email, mobile, topic, message }) => {
    await api.post(ENDPOINTS.enquiries.create, { name, email, mobile, topic, message });
  },
};
