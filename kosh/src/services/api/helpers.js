import api from "./axiosClient";

/* DRF list endpoints return either a plain array or a paginated { count, next, results } object.
   This handles both and follows `next` links, so pagination can be switched on in Django later without front-end changes. */
export async function listAll(url, params) {
  const first = await api.get(url, { params });
  if (Array.isArray(first.data)) return first.data;
  const out = [...(first.data.results || [])];
  let next = first.data.next;
  let guard = 0;
  while (next && guard++ < 200) {
    const res = await api.get(next, { baseURL: "" }); // `next` is an absolute URL
    out.push(...(res.data.results || []));
    next = res.data.next;
  }
  return out;
}
