import axios from "axios";

/* Every failed request is converted into an ApiError, so UI code only ever needs `error.message`. */
export class ApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details; // raw field errors from DRF, e.g. { name: ["This field is required."] }
  }
}

const GENERIC = {
  400: "Please check the entered details and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You do not have permission to do this.",
  404: "The requested item was not found.",
  429: "Too many requests. Please wait a moment and try again.",
};

/* Pull a readable message out of the common Django REST Framework error shapes. */
function messageFromData(data) {
  if (!data || typeof data === "string") return "";
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  const first = (v) => (Array.isArray(v) ? first(v[0]) : typeof v === "string" ? v : v && typeof v === "object" ? messageFromData(v) : "");
  if (data.non_field_errors) return first(data.non_field_errors);
  const key = Object.keys(data)[0];
  if (!key) return "";
  const msg = first(data[key]);
  return msg ? `${key.replace(/_/g, " ")}: ${msg}` : "";
}

export function normalizeError(err) {
  if (err instanceof ApiError) return err;
  if (axios.isCancel(err)) return new ApiError("Request cancelled.", { code: "CANCELLED" });

  if (err && err.response) {
    const { status, data } = err.response;
    const msg = messageFromData(data) || (status >= 500 ? "Server error. Please try again in a moment." : GENERIC[status]) || "Something went wrong.";
    return new ApiError(msg, { status, code: "HTTP_ERROR", details: data });
  }
  if (err && (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT")) {
    return new ApiError("The server took too long to respond. Please try again.", { code: "TIMEOUT" });
  }
  if (err && err.request) {
    return new ApiError("Cannot reach the server. Check your internet connection and try again.", { code: "NETWORK" });
  }
  return new ApiError((err && err.message) || "Something went wrong.");
}

export const getErrorMessage = (err) => normalizeError(err).message;
