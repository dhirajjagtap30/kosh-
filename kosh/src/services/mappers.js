/* Django sends snake_case JSON; the UI uses camelCase. All conversion happens here, in one file.
   If your Django serializers use different field names, only this file needs to change. */

export const studentFromApi = (s) => ({ id: s.id, name: s.name, batch: s.batch, phone: s.phone || "" });
export const studentToApi = (s) => ({ name: s.name, batch: s.batch, phone: s.phone || "" });

export const testFromApi = (t) => ({
  id: t.id,
  name: t.name,
  type: t.type,
  batch: t.batch,
  date: t.date,
  duration: t.duration,
  totalMarks: t.total_marks,
  status: t.status,
  standard: t.standard || "",
  paperId: t.paper_id || null,
  paperTitle: t.paper_title || "",
  subject: t.subject || "",
  questionCount: t.question_count || 0,
  attempts: t.attempts || 0,
  batchIds: t.batch_ids || [],
  batchNames: t.batch_names || [],
  resultAnnounced: Boolean(t.result_announced),
  pendingChecks: t.pending_checks || 0,
});
export const testToApi = (t) => ({
  name: t.name,
  type: t.type,
  batch: t.batch,
  date: t.date,
  duration: t.duration,
  total_marks: t.totalMarks,
  status: t.status,
  standard: t.standard,
  paper_id: t.paperId || null,
  batch_ids: t.batchIds || [],
});

export const resultFromApi = (r) => ({
  testId: r.test_id,
  studentId: r.student_id,
  score: r.score, // percentage 0-100
  marks: r.marks,
  subjects: r.subjects || {}, // { Physics: 62.5, Chemistry: 48, Mathematics: 71 } (percentages)
});

export const settingsFromApi = (s) => ({
  institute: s.institute,
  email: s.email,
  phone: s.phone || "",
  lowScoreBelow: s.low_score_below,
  notifyEmail: s.notify_email,
  notifyLowScore: s.notify_low_score,
});
export const settingsToApi = (s) => ({
  institute: s.institute,
  email: s.email,
  phone: s.phone || "",
  low_score_below: s.lowScoreBelow,
  notify_email: s.notifyEmail,
  notify_low_score: s.notifyLowScore,
});

export const notificationFromApi = (n) => ({ id: n.id, text: n.text, read: Boolean(n.read) });

export const staffFromApi = (s) => ({ id: s.id, name: s.name, role: s.role, mobile: s.mobile || "", email: s.email || "", username: s.username });

export const userFromApi = (u) => ({ id: u.id, role: u.role, name: u.name, email: u.email, username: u.username, branchId: u.branch_id || 0 });

const SUBJECT_ICONS = { PCM: "📚", PHYSICS: "⚡", CHEMISTRY: "🧪", MATHEMATICS: "📐", BIOLOGY: "🧬" };

export const studentPortalFromApi = (d) => ({
  student: {
    name: d.student.name,
    institute: d.student.institute,
    batch: d.student.batch,
    rank: d.student.rank,
    accuracy: d.student.accuracy,
    testsDone: d.student.tests_done,
  },
  stats: {
    total: d.stats.total,
    completed: d.stats.completed,
    pending: d.stats.pending,
    missed: d.stats.missed,
    avgAccuracy: d.stats.avg_accuracy ?? null,
    correct: d.stats.correct,
    incorrect: d.stats.incorrect,
    unattempted: d.stats.unattempted,
    avgTime: d.stats.avg_time,
    overall: d.stats.overall,
  },
  subjects: (d.subjects || []).map((s) => ({ name: s.name, icon: s.icon || SUBJECT_ICONS[String(s.name).toUpperCase()] || "📘", value: s.value })),
  trend: d.trend || [], // last 10 test scores (%)
  upcomingExams: (d.upcoming_exams || []).map((e) => ({ id: e.id, name: e.name, date: e.date })),
  unreadNotifications: d.unread_notifications ?? 0,
});

/* Generic key converters for the newer modules (registrations, parents, questions, papers). Top-level keys only. */
const snakeKey = (k) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camelKey = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapKeys = (o, fn) => Object.fromEntries(Object.entries(o).map(([k, v]) => [fn(k), v]));
export const toSnake = (o) => mapKeys(o, snakeKey);
export const toCamel = (o) => mapKeys(o, camelKey);
