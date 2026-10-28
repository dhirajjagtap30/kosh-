import api from "./api/axiosClient";
import { listAll } from "./api/helpers";
import { toCamel, toSnake } from "./mappers";

/* One small factory for every "list / create / update / delete" resource (Django ModelViewSet style):
   GET base, POST base, PATCH base/<id>/, DELETE base/<id>/. */
export const makeCrud = (base) => ({
  list: async () => (await listAll(base)).map(toCamel),
  create: async (o) => toCamel((await api.post(base, toSnake(o))).data),
  update: async (id, o) => toCamel((await api.patch(`${base}${id}/`, toSnake(o))).data),
  remove: async (id) => { await api.delete(`${base}${id}/`); },
});
