import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";
import { listAll } from "./api/helpers";
import { notificationFromApi } from "./mappers";

export const notificationService = {
  list: async () => (await listAll(ENDPOINTS.notifications.list)).map(notificationFromApi),
  markAllRead: async () => { await api.post(ENDPOINTS.notifications.markAllRead); },
};
