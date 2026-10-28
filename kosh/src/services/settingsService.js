import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";
import { settingsFromApi, settingsToApi } from "./mappers";

export const settingsService = {
  get: async () => settingsFromApi((await api.get(ENDPOINTS.settings.detail)).data),
  update: async (settings) => settingsFromApi((await api.patch(ENDPOINTS.settings.detail, settingsToApi(settings))).data),
};
