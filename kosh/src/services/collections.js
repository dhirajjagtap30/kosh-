import api from "./api/axiosClient";
import { ENDPOINTS } from "./api/endpoints";
import { makeCrud } from "./crud";
import { listAll } from "./api/helpers";
import { toCamel, toSnake } from "./mappers";
import { env } from "../config/env";

export const registrationService = makeCrud(ENDPOINTS.registrations.list);
export const parentService = makeCrud(ENDPOINTS.parents.list);
export const questionService = makeCrud(ENDPOINTS.questions.list);
export const paperService = makeCrud(ENDPOINTS.papers.list);
export const batchService = makeCrud(ENDPOINTS.batches.list);
/* Study material (notes + video links). A note carries a File: real backend = multipart upload, demo mode = file kept as a data URL. */
const readDataUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("Could not read the file.")); r.readAsDataURL(file); });
const materialBody = async ({ file, ...rest }) => {
  const body = toSnake(rest);
  if (!file) return body;
  if (env.USE_MOCK) return { ...body, file_name: file.name, file_data: await readDataUrl(file) };
  const fd = new FormData();
  Object.entries(body).forEach(([k, v]) => { if (Array.isArray(v)) fd.append(`${k}_json`, JSON.stringify(v)); else if (v !== undefined && v !== null) fd.append(k, v); });
  fd.append("file", file);
  return fd;
};
export const materialService = {
  list: async () => (await listAll(ENDPOINTS.materials.list)).map(toCamel),
  create: async (o) => toCamel((await api.post(ENDPOINTS.materials.list, await materialBody(o))).data),
  update: async (id, o) => {
    const b = await materialBody(o);
    if (typeof FormData !== "undefined" && b instanceof FormData) { b.append("_method", "PATCH"); return toCamel((await api.post(ENDPOINTS.materials.detail(id), b)).data); } // PHP cannot read a multipart PATCH
    return toCamel((await api.patch(ENDPOINTS.materials.detail(id), b)).data);
  },
  remove: async (id) => { await api.delete(ENDPOINTS.materials.detail(id)); },
  forStudent: async () => (await listAll(ENDPOINTS.studentMaterials.list)).map(toCamel),
};
/* Branches = white-label brands. publicList needs no login (branding + registration form). */
export const branchService = { ...makeCrud(ENDPOINTS.branches.list), publicList: async () => (await listAll(ENDPOINTS.branches.publicList)).map(toCamel) };
/* LMS courses (admin: CRUD, lessons travel inside the course) + the logged-in student's courses with their progress. */
export const courseService = { ...makeCrud(ENDPOINTS.courses.list), progress: async (id) => (await api.get(ENDPOINTS.courses.progress(id))).data };
export const studentCourseService = {
  list: async () => (await listAll(ENDPOINTS.studentCourses.list)).map(toCamel),
  mark: async (id, lessonId, done) => toCamel((await api.post(ENDPOINTS.studentCourses.progress(id), { lesson_id: lessonId, done })).data),
};
/* Parent portal (everything is about the parent's own child, identified by the auth token). */
export const parentPortalService = {
  dashboard: async () => (await api.get(ENDPOINTS.parentPortal.dashboard)).data,
  profile: async () => { const d = (await api.get(ENDPOINTS.parentPortal.profile)).data; return { parent: toCamel(d.parent || {}), child: d.child ? toCamel(d.child) : null }; },
  results: async () => { const d = (await api.get(ENDPOINTS.parentPortal.results)).data; return { results: (d.results || []).map(toCamel), pending: (d.pending || []).map(toCamel) }; },
  notices: async () => (await listAll(ENDPOINTS.parentPortal.notices)).map(toCamel),
};
export const parentMessageService = {
  list: async () => (await listAll(ENDPOINTS.parentPortal.messages)).map(toCamel),
  send: async (subject, text) => toCamel((await api.post(ENDPOINTS.parentPortal.messages, { subject, text })).data),
};
/* admin / staff: notices for parents (Dashboard -> Notices) */
export const noticeService = makeCrud(ENDPOINTS.notices.list);

export const examResultService = {
  list: async () => (await listAll(ENDPOINTS.examResults.list)).map(toCamel),
  get: async (id) => toCamel((await api.get(ENDPOINTS.examResults.detail(id))).data), // includes the answer review
  grade: async (id, marks) => toCamel((await api.patch(ENDPOINTS.examResults.detail(id), { marks })).data), // { questionId: marks } for subjective answers
  reset: async (id) => { await api.delete(ENDPOINTS.examResults.detail(id)); }, // student can write the test again
};
export const studentExamService = {
  list: async () => (await listAll(ENDPOINTS.studentExams.list)).map(toCamel),
  questions: async (id) => (await api.get(ENDPOINTS.studentExams.questions(id))).data,
  submit: async (id, answers) => toCamel((await api.post(ENDPOINTS.studentExams.submit(id), { answers })).data),
  result: async (id) => toCamel((await api.get(ENDPOINTS.studentExams.result(id))).data),
};

/* Attendance. Records: { id, studentId, date "YYYY-MM-DD", status Present|Absent|Late|Leave, inTime, outTime, source Manual|Biometric, note }. */
export const attendanceService = {
  list: async (from, to) => (await listAll(ENDPOINTS.attendance.list, { from, to })).map(toCamel),
  /* manual: one day, many students -> { saved } */
  mark: async (date, records) => toCamel((await api.post(ENDPOINTS.attendance.mark, { date, records: records.map(toSnake) })).data),
  /* biometric log: punches [{ biometricId, timestamp "YYYY-MM-DD HH:MM" }] -> summary of what was saved */
  importPunches: async ({ punches, lateAfter, markAbsent }) => toCamel((await api.post(ENDPOINTS.attendance.importLog, { punches: punches.map(toSnake), late_after: lateAfter || "", mark_absent: markAbsent })).data),
  forStudent: async () => (await listAll(ENDPOINTS.attendance.student)).map(toCamel),
  forParent: async () => (await listAll(ENDPOINTS.attendance.parent)).map(toCamel),
};

/* "Notify students" for a test -> { sent }. And the logged-in student's notification list (bell icon). */
export const testNotifyService = { send: async (id) => (await api.post(ENDPOINTS.testNotify(id))).data };
/* Teacher: send a message to a standard / batches / chosen students -> { sent } */
export const sendNotificationService = { send: async (o) => (await api.post(ENDPOINTS.sendNotification, toSnake(o))).data };
export const studentNotificationService = {
  list: async () => (await listAll(ENDPOINTS.studentNotifications.list)).map(toCamel),
  markAllRead: async () => { await api.post(ENDPOINTS.studentNotifications.markAllRead); },
};

/* Student portal extras: profile, mock tests (self practice, instant result), mark my attendance (today), messages to the institute. */
export const studentProfileService = { get: async () => toCamel((await api.get(ENDPOINTS.studentProfile)).data) };
export const mockTestService = {
  list: async () => (await listAll(ENDPOINTS.studentMockTests.list)).map(toCamel),
  questions: async (id) => (await api.get(ENDPOINTS.studentMockTests.questions(id))).data,
  submit: async (id, answers) => toCamel((await api.post(ENDPOINTS.studentMockTests.submit(id), { answers })).data),
};
export const selfAttendanceService = { markToday: async () => toCamel((await api.post(ENDPOINTS.studentAttendanceMark)).data) };
export const studentMessageService = {
  list: async () => (await listAll(ENDPOINTS.studentMessages)).map(toCamel),
  send: async (subject, text) => toCamel((await api.post(ENDPOINTS.studentMessages, { subject, text })).data),
};
/* admin / staff side: read the students' messages and reply */
export const messageService = {
  list: async () => (await listAll(ENDPOINTS.messages.list)).map(toCamel),
  reply: async (id, reply) => toCamel((await api.patch(ENDPOINTS.messages.detail(id), { reply })).data),
  remove: async (id) => { await api.delete(ENDPOINTS.messages.detail(id)); },
};
