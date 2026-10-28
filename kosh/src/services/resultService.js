import { ENDPOINTS } from "./api/endpoints";
import { listAll } from "./api/helpers";
import { resultFromApi } from "./mappers";

/* One row per (test, student) for completed tests. */
export const resultService = {
  list: async (params) => (await listAll(ENDPOINTS.results.list, params)).map(resultFromApi),
};
