import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";
import { listAll } from "./api/helpers";
import { studentFromApi, studentToApi } from "./mappers";

export const studentService = {
  list: async (params) => (await listAll(ENDPOINTS.students.list, params)).map(studentFromApi),
  create: async (student) => studentFromApi((await api.post(ENDPOINTS.students.list, studentToApi(student))).data),
  remove: async (id) => { await api.delete(ENDPOINTS.students.detail(id)); },
};
