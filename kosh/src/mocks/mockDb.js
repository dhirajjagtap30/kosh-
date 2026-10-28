/* Tiny "database" for the mock API, kept in localStorage so changes survive a refresh (same key/shape as the old store). */
import { seedStudents, seedTests, seedSettings, seedNotifications, seedRegistrations, seedQuestions, seedPapers } from "./seedData";
import { seedLms } from "./seedLms";
import { seedBranches } from "./seedBranches";
import { seedAttendance } from "./seedAttendance";
import { seedNotices } from "./seedNotices";
import { extraQuestions, subjectiveQuestions, SEED_VERSION } from "./seedExtra";

const KEY = "kosh-dashboard-v1";

const baseDefaults = () => ({
  students: seedStudents.map((s) => ({ ...s })),
  tests: seedTests.map((t) => ({ ...t })),
  settings: { ...seedSettings },
  notifications: seedNotifications.map((n) => ({ ...n })),
  staff: [],
  parents: [],
  registrations: seedRegistrations.map((r) => ({ ...r })),
  questions: seedQuestions.map((q) => ({ ...q })),
  papers: seedPapers.map((p) => ({ ...p })),
  attempts: [],
  batches: [],
  materials: [],
  courses: [],
  progress: [],
  branches: [],
  attendance: [],
  notices: [],
});

/* Adds the extra sample questions + one practice paper per standard/subject. Safe to run on old saved data:
   it only adds what is missing and never touches existing questions or papers. */
function topUp(db) {
  const a = seedLms(db), b = seedBranches(db); // LMS sample courses, then branches (each runs once per browser)
  const c = seedAttendance(db); // sample biometric IDs + last 3 weeks of attendance (once per browser)
  const n = seedNotices(db); // sample parent notices (once per browser)
  if (a || b || c || n) saveDb(db);
  if ((db.seedVersion || 0) >= SEED_VERSION) return db;
  const key = (q) => `${q.standard}|${q.subject}|${q.question}`;
  const have = new Set(db.questions.map(key));
  let qid = nextId(db.questions);
  [...extraQuestions, ...subjectiveQuestions].forEach((q) => { if (!have.has(key(q))) { db.questions.push({ id: qid++, ...q }); have.add(key(q)); } });

  const titles = new Set(db.papers.map((p) => p.title));
  let pid = nextId(db.papers);
  const groups = new Map();
  db.questions.filter((q) => q.type !== "Subjective").forEach((q) => { const k = `${q.standard}|${q.subject}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(q.id); });
  groups.forEach((ids, k) => {
    const [standard, subject] = k.split("|");
    const title = `${standard} ${subject} - Practice Paper`;
    if (titles.has(title)) return;
    db.papers.push({ id: pid++, title, standard, subject, duration: 30, status: "Published", question_ids: ids, created_on: "2026-10-26" });
  });
  db.seedVersion = SEED_VERSION;
  saveDb(db);
  return db;
}

const defaults = () => baseDefaults();

export function loadDb() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return topUp({ ...defaults(), ...JSON.parse(raw) });
  } catch { /* storage unavailable: use defaults */ }
  return topUp(defaults());
}

export function saveDb(db) {
  try { window.localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch { return false; } // false = browser storage full / unavailable
}

export function resetDb() {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
  return topUp(defaults());
}

export const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;
