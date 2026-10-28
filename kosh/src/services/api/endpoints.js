/* Every backend URL lives here (relative to VITE_API_BASE_URL).
   Trailing slashes match Django REST Framework router defaults. */
export const ENDPOINTS = {
  auth: {
    login: "/auth/login/",
    logout: "/auth/logout/",
    register: "/auth/register/",
  },
  students: {
    list: "/students/",
    detail: (id) => `/students/${id}/`,
  },
  tests: {
    list: "/tests/",
    detail: (id) => `/tests/${id}/`,
  },
  results: { list: "/results/" },
  settings: { detail: "/settings/" },
  notifications: {
    list: "/notifications/",
    markAllRead: "/notifications/mark-all-read/",
  },
  studentPortal: { dashboard: "/student/dashboard/" },
  leads: { demoRequest: "/leads/demo-requests/" },
  enquiries: { create: "/enquiries/" },
  staff: { list: "/staff/", detail: (id) => `/staff/${id}/` }, // admin only
  registrations: { list: "/registrations/" },
  parents: { list: "/parents/" },
  questions: { list: "/questions/" },
  papers: { list: "/papers/" },
  examResults: { list: "/exam-results/", detail: (id) => `/exam-results/${id}/` },
  batches: { list: "/batches/" },
  materials: { list: "/materials/", detail: (id) => `/materials/${id}/` },
  branches: { list: "/branches/", publicList: "/branches/public/" },
  courses: { list: "/courses/", progress: (id) => `/courses/${id}/progress/` },
  studentCourses: { list: "/student/courses/", progress: (id) => `/student/courses/${id}/progress/` },
  studentMaterials: { list: "/student/materials/" },
  sendNotification: "/notifications/send/",
  testNotify: (id) => `/tests/${id}/notify/`,
  studentNotifications: { list: "/student/notifications/", markAllRead: "/student/notifications/mark-all-read/" },
  testReset: (id) => `/tests/${id}/reset/`,
  studentExams: { list: "/student/exams/", questions: (id) => `/student/exams/${id}/questions/`, submit: (id) => `/student/exams/${id}/submit/`, result: (id) => `/student/exams/${id}/result/` },
  parentPortal: { dashboard: "/parent/dashboard/", profile: "/parent/profile/", results: "/parent/results/", notices: "/parent/notices/", messages: "/parent/messages/" },
  notices: { list: "/notices/" }, // admin / staff: write notices for parents
  attendance: { list: "/attendance/", mark: "/attendance/mark/", importLog: "/attendance/import/", student: "/student/attendance/", parent: "/parent/attendance/" },
  studentProfile: "/student/profile/",
  studentMockTests: { list: "/student/mock-tests/", questions: (id) => `/student/mock-tests/${id}/questions/`, submit: (id) => `/student/mock-tests/${id}/submit/` },
  studentAttendanceMark: "/student/attendance/mark/",
  studentMessages: "/student/messages/",
  messages: { list: "/messages/", detail: (id) => `/messages/${id}/` },
  demo: { reset: "/demo/reset/" }, // mock/dev only
};
