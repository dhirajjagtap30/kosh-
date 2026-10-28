import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";
import { listAll } from "./api/helpers";
import { testFromApi, testToApi } from "./mappers";

export const testService = {
  list: async (params) => (await listAll(ENDPOINTS.tests.list, params)).map(testFromApi),
  create: async (test) => testFromApi((await api.post(ENDPOINTS.tests.list, testToApi(test))).data),
  setStatus: async (id, status) => testFromApi((await api.patch(ENDPOINTS.tests.detail(id), { status })).data),
  /* assign the test to batches (empty list = every student of the test's standard) */
  setBatches: async (id, batchIds) => testFromApi((await api.patch(ENDPOINTS.tests.detail(id), { batch_ids: batchIds })).data),
  /* announce / hide the result of a test (students see their marks only after it is announced) */
  setAnnounced: async (id, announced) => testFromApi((await api.patch(ENDPOINTS.tests.detail(id), { result_announced: announced })).data),
  /* TEST RESET: removes every student's attempt of this test and hides the result again */
  resetAll: async (id) => testFromApi((await api.post(ENDPOINTS.testReset(id))).data),
  remove: async (id) => { await api.delete(ENDPOINTS.tests.detail(id)); },
};
