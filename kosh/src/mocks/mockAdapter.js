/* Mock API: plugs into axios as a custom `adapter`, so services/interceptors/errors behave exactly as with a real server.
   It speaks the same JSON contract Django should (snake_case, DRF-style error bodies). See docs/API_CONTRACT.md. */
import { AxiosError } from "axios";
import { env } from "../config/env";
import { DEMO_ACCOUNTS } from "./demoAccounts";
import { computeResults, seedStudentPortal } from "./seedData";
import { loadDb, saveDb, resetDb, nextId } from "./mockDb";

const ok = (data, status = 200) => ({ status, data });
const fail = (status, data) => ({ status, data });
const required = (field) => ({ [field]: ["This field may not be blank."] });

const testOut = (t, db) => {
  const d = db || loadDb();
  const p = t.paper_id ? d.papers.find((x) => x.id === t.paper_id) : null;
  return { id: t.id, name: t.name, type: t.type, batch: t.batch, date: t.date, duration: p ? p.duration : t.duration, total_marks: p ? p.question_ids.reduce((s, id) => s + ((d.questions.find((q) => q.id === id) || {}).marks || 0), 0) : t.totalMarks,
    status: t.status, standard: t.standard || "", paper_id: t.paper_id || null, paper_title: p ? p.title : "", subject: p ? p.subject : "", question_count: p ? p.question_ids.length : 0, attempts: d.attempts.filter((a) => a.exam_id === t.id).length,
    batch_ids: t.batch_ids || [], batch_names: (t.batch_ids || []).map((id) => (d.batches.find((b) => b.id === id) || {}).name).filter(Boolean),
    result_announced: Boolean(t.result_announced), pending_checks: d.attempts.filter((a) => a.exam_id === t.id && a.pending_review).length };
};
const settingsOut = (s) => ({ institute: s.institute, email: s.email, phone: s.phone, low_score_below: s.lowScoreBelow, notify_email: s.notifyEmail, notify_low_score: s.notifyLowScore });
const note = (db, text) => { db.notifications = [{ id: nextId(db.notifications), text, read: false }, ...db.notifications].slice(0, 20); };

/* Student notifications: delivered to the students of the test's standard (and its batches, if any) in the test's branch. */
const notifyStudents = (db, t, text) => {
  const bids = t.batch_ids || [];
  const inBatch = (r) => !bids.length || db.batches.some((b) => bids.includes(b.id) && (b.student_ids || []).includes(r.id));
  const ids = db.registrations.filter((r) => r.status !== "Inactive" && r.standard === t.standard && (!t.branch_id || r.branch_id === t.branch_id) && inBatch(r)).map((r) => r.id);
  if (!ids.length) return 0;
  db.student_notifications = db.student_notifications || [];
  db.student_notifications.unshift({ id: nextId(db.student_notifications), student_ids: ids, test_id: t.id, text, created_on: new Date().toISOString(), read_by: [] });
  db.student_notifications = db.student_notifications.slice(0, 200);
  return ids.length;
};
const testNote = (t) => `New ${t.type || "test"}: "${t.name}" on ${t.date}${t.duration ? ` (${t.duration} min)` : ""}. Open the Tests tab to attempt it.`;

const today = () => new Date().toISOString().slice(0, 10);
const isPhone = (v) => /^\d{10}$/.test(v || "");
const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v || "");
const blank = (v) => !String(v == null ? "" : v).trim();

const routes = [];
const route = (method, path, handler, delay) => routes.push({ method, re: new RegExp(`^${path.replace(/:id/g, "(\\d+)")}$`), handler, delay });

/* every account that can log in (demo + registered students + staff/trainers + parents) */
const allAccounts = (db) => [
  ...DEMO_ACCOUNTS.map((a) => ({ ...a, _k: "demo" })),
  ...db.registrations.map((r) => ({ ...r, _k: "registrations", id: `r${r.id}`, role: "student" })),
  ...db.staff.map((s) => ({ ...s, _k: "staff", id: `st${s.id}` })),
  ...db.parents.map((p) => ({ ...p, _k: "parents", id: `p${p.id}`, role: "parent" })),
];

/* ---- auth ---- */
route("post", "/auth/login/", ({ body }) => {
  const id = String(body.identifier || "").trim().toLowerCase();
  const db = loadDb();
  const u = allAccounts(db).find((x) => (x.email && x.email.toLowerCase() === id) || String(x.username).toLowerCase() === id);
  if (!u || u.password !== body.password) return fail(401, { detail: "Incorrect email/username or password." });
  if (u.status === "Inactive") return fail(403, { detail: "This account is inactive. Please contact the institute." });
  const branchId = u.role === "superadmin" ? 0 : Number(u.branch_id) || (u.role === "parent" ? (db.registrations.find((r) => r.id === u.student_id) || {}).branch_id : 0) || 0;
  const br = db.branches.find((b) => b.id === branchId);
  if (br && br.status === "Inactive") return fail(403, { detail: "This branch is inactive. Please contact the head office." });
  return ok({ access: `mock-token-${u.id}`, user: { id: u.id, role: u.role, name: u.name, email: u.email, username: u.username, branch_id: branchId } });
}, 500); // login keeps its original 500 ms feel

/* who is calling + which branch their data is limited to (0 = every branch). A super admin can pick one branch with the X-Branch-Id header. */
const viewer = (db, uid, hdr) => {
  const a = allAccounts(db).find((x) => String(x.id) === String(uid));
  if (!a) return { sc: 0, role: "" };
  return { role: a.role, sc: a.role === "superadmin" ? Number(hdr) || 0 : Number(a.branch_id) || 0 };
};
const own = (x, sc) => !sc || x.branch_id === sc;
/* branch for a new record: the caller's branch, or (super admin) the one chosen in the top bar */
const branchFor = (db, sc, body) => { const id = sc || Number((body || {}).branch_id) || 0; return db.branches.some((b) => b.id === id && b.status === "Active") ? { id } : { err: { branch_id: ["Select a branch (top bar) before adding."] } }; };
const branchName = (db, id) => (db.branches.find((b) => b.id === id) || {}).name || "";

/* duplicate login ID / email check; `self` = { k, id } of the record being edited */
const takenBy = (db, username, email, self) => {
  const all = allAccounts(db).filter((u) => !(self && u._k === self.k && String(u.id).replace(/^\D+/, "") === String(self.id)));
  if (username && all.some((u) => String(u.username).toLowerCase() === String(username).toLowerCase())) return { username: ["This ID is already taken."] };
  if (email && all.some((u) => u.email && u.email.toLowerCase() === String(email).toLowerCase())) return { email: ["An account with this email already exists."] };
  return null;
};

/* Generic ModelViewSet-style CRUD on the mock database (rows are stored exactly as the API sends them: snake_case). */
const pick = (b, keys) => Object.fromEntries(keys.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]));
function crud(base, key, { fields, check, out = (x) => x, onDelete, defaults = () => ({}), scoped = false, superOnly = false, canDelete, afterCreate }) {
  const o = (x, db) => (scoped ? { ...out(x, db), branch_name: branchName(db, x.branch_id) } : out(x, db));
  const deny = (role) => (superOnly && role !== "superadmin" ? fail(403, { detail: "Super admin only." }) : null);
  route("get", base, ({ sc, role }) => { const db = loadDb(); return deny(role) || ok(db[key].filter((x) => !scoped || own(x, sc)).map((x) => o(x, db))); });
  route("post", base, ({ body, sc, role }) => {
    const db = loadDb();
    if (deny(role)) return deny(role);
    const item = { id: nextId(db[key]), ...defaults(), ...pick(body, fields) };
    if (scoped) { const br = branchFor(db, sc, body); if (br.err) return fail(400, br.err); item.branch_id = br.id; }
    const err = check(item, db, null, body);
    if (err) return fail(400, err);
    db[key].push(item);
    if (afterCreate) afterCreate(db, item, body);
    saveDb(db);
    return ok(o(item, db), 201);
  });
  route("patch", `${base}:id/`, ({ m, body, sc, role }) => {
    const db = loadDb();
    if (deny(role)) return deny(role);
    const cur = db[key].find((x) => x.id === Number(m[1]) && (!scoped || own(x, sc)));
    if (!cur) return fail(404, { detail: "Not found." });
    const upd = pick(body, fields);
    if ("password" in upd && !upd.password) delete upd.password; // blank password on edit = keep the old one
    const item = { ...cur, ...upd };
    const err = check(item, db, cur.id, body);
    if (err) return fail(400, err);
    db[key] = db[key].map((x) => (x.id === cur.id ? item : x));
    saveDb(db);
    return ok(o(item, db));
  });
  route("delete", `${base}:id/`, ({ m, sc, role }) => {
    const db = loadDb();
    if (deny(role)) return deny(role);
    const id = Number(m[1]);
    if (!db[key].some((x) => x.id === id && (!scoped || own(x, sc)))) return fail(404, { detail: "Not found." });
    const bad = canDelete && canDelete(db, id);
    if (bad) return fail(400, bad);
    db[key] = db[key].filter((x) => x.id !== id);
    if (onDelete) onDelete(db, id);
    saveDb(db);
    return ok("", 204);
  });
}
const noPw = ({ password: _p, ...r }) => r;

/* ---- registrations (students who registered, or were added by the admin) ---- */
const REG_FIELDS = ["name", "mobile", "standard", "target", "medium", "date_of_birth", "email", "parent_name", "parent_mobile", "school_name", "username", "password", "status", "biometric_id"];
const regCheck = (r, db, self) => {
  if (blank(r.name)) return required("name");
  if (!isPhone(r.mobile)) return { mobile: ["Mobile number must be 10 digits."] };
  if (!r.standard) return required("standard");
  if (["11th", "12th", "Dropper / Repeater"].includes(r.standard) && !["JEE (Main)", "JEE (Advanced)", "NEET", "MHT-CET"].includes(r.target)) return { target: ["Choose the exam target (JEE Main / JEE Advanced / NEET / MHT-CET)."] };
  if (!["11th", "12th", "Dropper / Repeater"].includes(r.standard)) r.target = "";
  if (!r.medium) return required("medium");
  if (!r.date_of_birth) return required("date_of_birth");
  if (!isEmail(String(r.email || "").trim())) return { email: ["Enter a valid email address."] };
  if (blank(r.parent_name)) return required("parent_name");
  if (!isPhone(r.parent_mobile)) return { parent_mobile: ["Parent contact number must be 10 digits."] };
  if (blank(r.school_name)) return required("school_name");
  if (String(r.username || "").trim().length < 3) return { username: ["ID must be at least 3 characters."] };
  if (String(r.password || "").length < 6) return { password: ["Password must be at least 6 characters."] };
  r.biometric_id = String(r.biometric_id == null ? "" : r.biometric_id).trim();
  if (r.biometric_id && db.registrations.some((x) => x.id !== self && (x.branch_id || 0) === (r.branch_id || 0) && String(x.biometric_id || "").trim().toLowerCase() === r.biometric_id.toLowerCase())) return { biometric_id: ["This Biometric ID is already given to another student of this branch."] };
  return takenBy(db, r.username, String(r.email).trim(), self && { k: "registrations", id: self });
};
crud("/registrations/", "registrations", {
  scoped: true,
  fields: REG_FIELDS, check: regCheck, out: noPw,
  defaults: () => ({ status: "Active", registered_on: today() }),
  onDelete: (db, id) => { db.parents = db.parents.filter((p) => p.student_id !== id); },
});

route("post", "/auth/register/", ({ body }) => {
  const db = loadDb();
  const item = { id: nextId(db.registrations), ...pick(body, REG_FIELDS), status: "Active", registered_on: today(), branch_id: Number(body.branch_id) || 0 };
  if (!db.branches.some((b) => b.id === item.branch_id && b.status === "Active")) return fail(400, { branch_id: ["Select your branch."] });
  item.email = String(item.email || "").trim().toLowerCase();
  const err = regCheck(item, db, null);
  if (err) return fail(400, err);
  db.registrations.push(item);
  note(db, `New registration: ${item.name} (${item.standard}).`);
  saveDb(db);
  return ok({ detail: "Account created." }, 201);
});

/* ---- staff / trainers (admin creates them and chooses ID + password) ---- */
const staffOut = ({ password: _p, ...s }) => s;
crud("/staff/", "staff", {
  scoped: true,
  fields: ["name", "role", "mobile", "email", "username", "password"], out: staffOut,
  check: (s, db, self) => {
    if (blank(s.name)) return required("name");
    if (!["staff", "trainer", "admin"].includes(s.role)) return { role: ["Choose Staff, Trainer or Branch Admin."] };
    if (s.mobile && !isPhone(s.mobile)) return { mobile: ["Mobile number must be 10 digits."] };
    if (s.email && !isEmail(s.email)) return { email: ["Enter a valid email address."] };
    if (String(s.username || "").trim().length < 3) return { username: ["ID must be at least 3 characters."] };
    if (String(s.password || "").length < 6) return { password: ["Password must be at least 6 characters."] };
    return takenBy(db, s.username, String(s.email || "").trim().toLowerCase(), self && { k: "staff", id: self });
  },
});

/* ---- parents (admin links a parent login to a registered student) ---- */
crud("/parents/", "parents", {
  scoped: true,
  fields: ["name", "mobile", "email", "student_id", "username", "password"], out: noPw,
  check: (p, db, self) => {
    if (blank(p.name)) return required("name");
    if (p.mobile && !isPhone(p.mobile)) return { mobile: ["Mobile number must be 10 digits."] };
    if (p.email && !isEmail(p.email)) return { email: ["Enter a valid email address."] };
    if (!db.registrations.some((r) => r.id === Number(p.student_id))) return { student_id: ["Choose a registered student."] };
    if (String(p.username || "").trim().length < 3) return { username: ["ID must be at least 3 characters."] };
    if (String(p.password || "").length < 6) return { password: ["Password must be at least 6 characters."] };
    p.student_id = Number(p.student_id);
    return takenBy(db, p.username, String(p.email || "").trim().toLowerCase(), self && { k: "parents", id: self });
  },
});

/* ---- question bank: MCQ with 4 options, correct answer (index 0-3) and marks ---- */
crud("/questions/", "questions", {
  fields: ["standard", "subject", "chapter", "type", "question", "options", "answer", "model_answer", "marks"],
  defaults: () => ({ type: "MCQ" }),
  check: (q) => {
    if (!q.standard) return required("standard");
    if (!q.subject) return required("subject");
    if (blank(q.question)) return required("question");
    if (!["MCQ", "Subjective"].includes(q.type || "MCQ")) return { type: ["Choose MCQ or Subjective."] };
    q.type = q.type || "MCQ";
    if (!(Number(q.marks) > 0)) return { marks: ["Marks must be greater than 0."] };
    q.marks = Number(q.marks);
    if (q.type === "Subjective") { q.options = []; q.answer = null; return null; } // written answer: the teacher checks it
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(blank)) return { options: ["Fill all 4 options."] };
    if (![0, 1, 2, 3].includes(Number(q.answer))) return { answer: ["Choose the correct answer."] };
    q.answer = Number(q.answer);
    return null;
  },
  onDelete: (db, id) => { db.papers = db.papers.map((p) => ({ ...p, question_ids: p.question_ids.filter((x) => x !== id) })); },
});

/* ---- question papers (a set of questions for one standard + subject) ---- */
const paperOut = (p, db) => ({ ...p, total_marks: p.question_ids.reduce((s, id) => s + ((db.questions.find((q) => q.id === id) || {}).marks || 0), 0) });
crud("/papers/", "papers", {
  fields: ["title", "standard", "subject", "duration", "status", "question_ids"], out: paperOut,
  defaults: () => ({ status: "Draft", created_on: today() }),
  check: (p, db) => {
    if (blank(p.title)) return required("title");
    if (!p.standard) return required("standard");
    if (!p.subject) return required("subject");
    if (!(Number(p.duration) >= 1)) return { duration: ["Duration must be at least 1 minute."] };
    if (!Array.isArray(p.question_ids) || !p.question_ids.length) return { question_ids: ["Select at least one question."] };
    if (p.question_ids.some((id) => !db.questions.some((q) => q.id === id && q.standard === p.standard && q.subject === p.subject))) return { question_ids: ["All questions must belong to the same standard and subject."] };
    p.duration = Number(p.duration);
    return null;
  },
  onDelete: (db, id) => { db.tests = db.tests.map((t) => (t.paper_id === id ? { ...t, paper_id: null } : t)); },
});


/* ---- batches: a named group of registered students of one standard; a test can be assigned to one or more batches ---- */
crud("/batches/", "batches", {
  scoped: true,
  fields: ["name", "standard", "student_ids"],
  out: (b, db) => ({ ...b, student_count: (b.student_ids || []).length }),
  check: (b, db, self) => {
    if (blank(b.name)) return required("name");
    if (!b.standard) return required("standard");
    if (db.batches.some((x) => x.id !== self && x.standard === b.standard && x.name.trim().toLowerCase() === String(b.name).trim().toLowerCase())) return { name: ["A batch with this name already exists for this standard."] };
    b.name = String(b.name).trim();
    b.student_ids = (b.student_ids || []).map(Number);
    if (b.student_ids.some((id) => !db.registrations.some((r) => r.id === id && r.standard === b.standard))) return { student_ids: ["Students must be registered and belong to the batch standard."] };
    return null;
  },
  onDelete: (db, id) => { db.tests = db.tests.map((t) => (t.batch_ids ? { ...t, batch_ids: t.batch_ids.filter((x) => x !== id) } : t)); },
});


/* ---- branches = white-label brands. Public list (no login) feeds the branding + the registration form; CRUD is super admin only. ---- */
const BRAND_FIELDS = ["id", "code", "name", "city", "brand_name", "institute_name", "tagline", "logo", "primary_color", "dark_color", "domain", "phone", "email"];
route("get", "/branches/public/", () => ok(loadDb().branches.filter((b) => b.status === "Active").map((b) => pick(b, BRAND_FIELDS))), 0);
const HEX = /^#[0-9a-f]{6}$/i;
crud("/branches/", "branches", {
  superOnly: true,
  fields: ["name", "code", "city", "address", "phone", "email", "brand_name", "institute_name", "tagline", "logo", "primary_color", "dark_color", "domain", "status"],
  defaults: () => ({ status: "Active", logo: "", tagline: "", domain: "", primary_color: "#2563eb", dark_color: "#0a2463" }),
  out: (b, db) => ({ ...b, student_count: db.registrations.filter((r) => r.branch_id === b.id).length, course_count: db.courses.filter((c) => c.branch_id === b.id).length, staff_count: db.staff.filter((x) => x.branch_id === b.id).length, test_count: db.tests.filter((t) => t.branch_id === b.id).length }),
  check: (b, db, self, body) => {
    if (blank(b.name)) return required("name");
    b.code = String(b.code || "").trim().toLowerCase();
    if (!/^[a-z0-9-]{2,20}$/.test(b.code)) return { code: ["Branch code: 2-20 letters, digits or hyphen (used in the branch link)."] };
    if (db.branches.some((x) => x.code === b.code && x.id !== self)) return { code: ["This branch code is already used."] };
    if (blank(b.brand_name)) return required("brand_name");
    if (!HEX.test(b.primary_color || "") || !HEX.test(b.dark_color || "")) return { primary_color: ["Choose valid colours."] };
    if (b.logo && b.logo.length > 400000) return { logo: ["Logo is too large (max about 250 KB)."] };
    if (b.email && !isEmail(b.email)) return { email: ["Enter a valid email address."] };
    b.domain = String(b.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (b.domain && db.branches.some((x) => x.domain === b.domain && x.id !== self)) return { domain: ["This domain is already used by another branch."] };
    if (!["Active", "Inactive"].includes(b.status)) return { status: ["Choose Active or Inactive."] };
    if (!self && body && body.admin_username) {
      if (blank(body.admin_name)) return { admin_name: ["Enter the branch admin name."] };
      if (String(body.admin_username).trim().length < 3) return { admin_username: ["Admin ID must be at least 3 characters."] };
      if (String(body.admin_password || "").length < 6) return { admin_password: ["Admin password must be at least 6 characters."] };
      return takenBy(db, body.admin_username, body.admin_email ? String(body.admin_email).trim() : "", null);
    }
    return null;
  },
  afterCreate: (db, b, body) => {
    if (!body.admin_username) return;
    db.staff.push({ id: nextId(db.staff), name: String(body.admin_name).trim(), role: "admin", mobile: "", email: String(body.admin_email || "").trim() || `${String(body.admin_username).trim()}@branch.local`, username: String(body.admin_username).trim(), password: body.admin_password, branch_id: b.id });
  },
  onDelete: (db, id) => { db.staff = db.staff.filter((x) => x.branch_id !== id); db.courses = db.courses.filter((x) => x.branch_id !== id); },
  canDelete: (db, id) => (db.branches.length <= 1 ? { detail: "At least one branch must exist." } : ["registrations", "courses", "tests", "batches", "materials"].some((k) => db[k].some((x) => x.branch_id === id)) || db.staff.some((x) => x.branch_id === id && x.role !== "admin") ? { detail: "This branch still has students, staff, courses or tests. Deactivate it instead of deleting." } : null),
});

/* ---- study material: notes (uploaded file) and video links, uploaded by the admin, shown to students of that standard ----
   Mock only: the file is kept inside the browser storage as a data URL (small files). A real backend stores it as a normal file upload. */
const MAX_MOCK_FILE = 1_500_000; // characters of base64 ≈ 1.1 MB
const matOut = ({ file_data: fd, ...m }) => ({ ...m, file_url: fd || "" });
const MAT_FIELDS = ["title", "standard", "subject", "kind", "url", "description", "file_name", "file_data", "batch_ids"];
const matCheck = (m) => {
  if (blank(m.title)) return required("title");
  if (!m.standard) return required("standard");
  if (!m.subject) return required("subject");
  if (!["Note", "Video"].includes(m.kind)) return { kind: ["Choose Note or Video."] };
  if (m.kind === "Video" && !/^https?:\/\/\S+\.\S+/i.test(String(m.url || "").trim())) return { url: ["Enter a valid video link starting with http:// or https://"] };
  if (m.kind === "Note" && !m.file_data) return { file: ["Choose a file to upload."] };
  if (m.file_data && m.file_data.length > MAX_MOCK_FILE) return { file: ["File is too large for demo mode (max about 1 MB). The real backend accepts bigger files."] };
  if (m.kind === "Video") { m.file_data = ""; m.file_name = ""; } else m.url = "";
  m.batch_ids = (m.batch_ids || []).map(Number); // empty = every student of the standard
  m.title = String(m.title).trim();
  return null;
};
route("get", "/materials/", ({ sc }) => ok(loadDb().materials.filter((x) => own(x, sc)).map(matOut)));
route("post", "/materials/", ({ body, sc }) => {
  const db = loadDb();
  const br = branchFor(db, sc, body);
  if (br.err) return fail(400, br.err);
  const item = { id: nextId(db.materials), created_on: today(), branch_id: br.id, ...pick(body, MAT_FIELDS) };
  const err = matCheck(item);
  if (err) return fail(400, err);
  db.materials.push(item);
  if (!saveDb(db)) return fail(400, { file: ["Browser storage is full (demo mode). Delete old notes or connect the real backend."] });
  return ok(matOut(item), 201);
});
route("patch", "/materials/:id/", ({ m, body, sc }) => {
  const db = loadDb();
  const cur = db.materials.find((x) => x.id === Number(m[1]) && own(x, sc));
  if (!cur) return fail(404, { detail: "Not found." });
  const item = { ...cur, ...pick(body, MAT_FIELDS) };
  const err = matCheck(item);
  if (err) return fail(400, err);
  db.materials = db.materials.map((x) => (x.id === cur.id ? item : x));
  if (!saveDb(db)) return fail(400, { file: ["Browser storage is full (demo mode)."] });
  return ok(matOut(item));
});
route("delete", "/materials/:id/", ({ m, sc }) => {
  const db = loadDb();
  const id = Number(m[1]);
  if (!db.materials.some((x) => x.id === id && own(x, sc))) return fail(404, { detail: "Not found." });
  db.materials = db.materials.filter((x) => x.id !== id);
  saveDb(db);
  return ok("", 204);
});

/* ---- online exams: a TEST with a standard + question paper is shown to every student of that standard ----
   Student sees: Draft = hidden · Scheduled before its date = "Scheduled" · Scheduled on/after its date = "Live" (can start) · Completed = "Closed". */
const examState = (t) => (t.status === "Completed" ? "Closed" : t.date > today() ? "Scheduled" : "Live");
const inAssignedBatch = (db, t, s) => !(t.batch_ids || []).length || db.batches.some((b) => t.batch_ids.includes(b.id) && (b.student_ids || []).includes(Number(String(s.key).replace(/^\D+/, ""))) && String(s.key).startsWith("r"));
const takeable = (db, t, s) => (!t.branch_id || t.branch_id === s.branch_id) && t.standard && t.standard === s.standard && t.paper_id && t.status !== "Draft" && db.papers.some((p) => p.id === t.paper_id) && inAssignedBatch(db, t, s);
route("get", "/exam-results/", ({ sc }) => {
  const db = loadDb();
  return ok(db.attempts.filter((a) => own(db.tests.find((t) => t.id === a.exam_id) || {}, sc)).map(({ review, ...a }) => ({ ...a, has_subjective: (review || []).some((r) => r.type === "Subjective"), exam_title: (db.tests.find((t) => t.id === a.exam_id) || {}).name || "" })));
});
/* one attempt with the full answer review (the teacher opens this to check subjective answers) */
route("get", "/exam-results/:id/", ({ m }) => {
  const db = loadDb();
  const a = db.attempts.find((x) => x.id === Number(m[1]));
  return a ? ok({ ...a, exam_title: (db.tests.find((t) => t.id === a.exam_id) || {}).name || "" }) : fail(404, { detail: "Not found." });
});
/* teacher gives marks for the subjective answers: body { marks: { "<question id>": 2.5 } } */
route("patch", "/exam-results/:id/", ({ m, body }) => {
  const db = loadDb();
  const a = db.attempts.find((x) => x.id === Number(m[1]));
  if (!a) return fail(404, { detail: "Not found." });
  const given = body.marks || {};
  for (const r of a.review) {
    if (r.type !== "Subjective" || given[r.id] === undefined) continue;
    const v = Number(given[r.id]);
    if (!(v >= 0 && v <= r.marks)) return fail(400, { marks: [`Marks for "${r.question.slice(0, 30)}…" must be between 0 and ${r.marks}.`] });
    r.awarded = v;
  }
  scoreAttempt(a);
  saveDb(db);
  return ok(a);
});
/* TEST RESET: delete one student's attempt so the student can write the test again */
route("delete", "/exam-results/:id/", ({ m }) => {
  const db = loadDb();
  const a = db.attempts.find((x) => x.id === Number(m[1]));
  if (!a) return fail(404, { detail: "Not found." });
  db.attempts = db.attempts.filter((x) => x.id !== a.id);
  note(db, `Attempt of ${a.student_name} reset — the student can write the test again.`);
  saveDb(db);
  return ok("", 204);
});
/* reset the whole test (every student's attempt) and hide the result again */
route("post", "/tests/:id/reset/", ({ m }) => {
  const db = loadDb();
  const t = db.tests.find((x) => x.id === Number(m[1]));
  if (!t) return fail(404, { detail: "Not found." });
  db.attempts = db.attempts.filter((a) => a.exam_id !== t.id);
  t.result_announced = false;
  saveDb(db);
  return ok(testOut(t, db));
});

/* the logged-in student, from the token: registered students are "r<id>", the demo student is "s1" */
const studentOf = (db, uid) => {
  const r = String(uid).startsWith("r") ? db.registrations.find((x) => x.id === Number(String(uid).slice(1))) : null;
  if (r) return { key: uid, name: r.name, standard: r.standard, target: r.target || "", branch_id: r.branch_id || 0 };
  if (uid === "s1") return { key: uid, name: "Abhijeet", standard: "10th", target: "", branch_id: 1 };
  return null;
};
/* Score = MCQ (auto-checked) + subjective marks given by the teacher. Subjective answers stay "pending" until every one has marks. */
const scoreAttempt = (a) => {
  const mcq = a.review.filter((r) => r.type !== "Subjective");
  const subj = a.review.filter((r) => r.type === "Subjective");
  a.correct = mcq.filter((r) => r.chosen === r.answer).length;
  a.unattempted = mcq.filter((r) => r.chosen === null).length;
  a.wrong = mcq.length - a.correct - a.unattempted;
  a.mcq_score = mcq.filter((r) => r.chosen === r.answer).reduce((x, r) => x + r.marks, 0);
  a.subjective_score = subj.reduce((x, r) => x + (r.awarded || 0), 0);
  a.score = a.mcq_score + a.subjective_score;
  a.total = a.review.reduce((x, r) => x + r.marks, 0);
  a.pending_review = subj.some((r) => r.awarded === null || r.awarded === undefined);
  return a;
};
/* what the STUDENT may see: nothing but "submitted" until the admin announces the result */
const resultOut = (a, db) => {
  const t = db.tests.find((x) => x.id === a.exam_id) || {};
  if (!t.result_announced) return { id: a.id, exam_title: t.name || "", announced: false, date: a.submitted_on, review: [] };
  return { id: a.id, exam_title: t.name || "", announced: true, score: a.score, total: a.total, correct: a.correct, wrong: a.wrong, unattempted: a.unattempted, mcq_score: a.mcq_score, subjective_score: a.subjective_score, date: a.submitted_on, review: a.review || [] };
};
route("get", "/student/exams/", ({ uid }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  if (!s) return fail(403, { detail: "Students only." });
  return ok(db.tests.filter((t) => takeable(db, t, s)).map((t) => {
    const a = db.attempts.find((x) => x.exam_id === t.id && x.student_key === s.key);
    const o = testOut(t, db);
    return { id: t.id, title: t.name, date: t.date, status: examState(t), standard: t.standard, subject: o.subject, duration: o.duration, question_count: o.question_count, total_marks: o.total_marks,
      result_announced: Boolean(t.result_announced), my_attempt: a ? (t.result_announced ? { id: a.id, score: a.score, total: a.total, announced: true } : { id: a.id, announced: false }) : null };
  }));
});
/* study material of the logged-in student's standard */
route("get", "/student/materials/", ({ uid }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  if (!s) return fail(403, { detail: "Students only." });
  const rid = regIdOf(uid);
  const inBatches = (x) => !(x.batch_ids || []).length || db.batches.some((b) => x.batch_ids.includes(b.id) && (b.student_ids || []).includes(rid));
  return ok(db.materials.filter((x) => x.standard === s.standard && (!x.branch_id || x.branch_id === s.branch_id) && inBatches(x)).map(matOut).reverse());
});

/* ---- LMS: courses (lessons live inside the course) + per-student progress ----
   A student sees a Published course when the standard matches AND (course has no target OR it equals the student's exam target). */
const LESSON_KINDS = ["Video", "Notes", "Live class", "Practice"];
const eligible = (c, r) => r.status !== "Inactive" && r.branch_id === c.branch_id && r.standard === c.standard && (!c.target || c.target === r.target);
const courseCheck = (c) => {
  if (blank(c.title)) return required("title");
  if (!c.standard) return required("standard");
  if (["11th", "12th", "Dropper / Repeater"].includes(c.standard) === false) c.target = "";
  if (blank(c.subject)) return required("subject");
  if (!["Published", "Draft"].includes(c.status)) return { status: ["Choose Published or Draft."] };
  const lessons = Array.isArray(c.lessons) ? c.lessons : [];
  for (const l of lessons) {
    if (blank(l.title)) return { lessons: ["Every lesson needs a title."] };
    if (!LESSON_KINDS.includes(l.kind)) return { lessons: [`Lesson "${l.title}": choose a valid type.`] };
    if (["Video", "Notes"].includes(l.kind) && l.url && !/^https?:\/\/\S+\.\S+/i.test(String(l.url).trim())) return { lessons: [`Lesson "${l.title}": the link must start with http:// or https://`] };
  }
  let n = lessons.reduce((m, l) => Math.max(m, Number(l.id) || 0), 0);
  c.lessons = lessons.map((l) => ({ id: Number(l.id) || ++n, title: String(l.title).trim(), chapter: String(l.chapter || "").trim(), kind: l.kind, url: String(l.url || "").trim(), minutes: Number(l.minutes) || 0, when: String(l.when || "").trim() }));
  c.title = String(c.title).trim();
  return null;
};
const courseOut = (c, db) => {
  const learners = db.registrations.filter((r) => eligible(c, r));
  const ids = new Set(c.lessons.map((l) => l.id));
  const pct = (r) => { const p = db.progress.find((x) => x.student_key === `r${r.id}` && x.course_id === c.id); return c.lessons.length && p ? Math.round((p.lesson_ids.filter((i) => ids.has(i)).length / c.lessons.length) * 100) : 0; };
  return { ...c, lesson_count: c.lessons.length, learner_count: learners.length, avg_progress: learners.length ? Math.round(learners.reduce((a, r) => a + pct(r), 0) / learners.length) : 0 };
};
crud("/courses/", "courses", {
  scoped: true,
  fields: ["title", "standard", "target", "subject", "description", "status", "lessons"], out: courseOut,
  defaults: () => ({ status: "Draft", target: "", description: "", lessons: [], created_on: today() }),
  check: (c) => courseCheck(c),
  onDelete: (db, id) => { db.progress = db.progress.filter((p) => p.course_id !== id); },
});
/* admin: how far every eligible student has come in one course */
route("get", "/courses/:id/progress/", ({ m }) => {
  const db = loadDb();
  const c = db.courses.find((x) => x.id === Number(m[1]));
  if (!c) return fail(404, { detail: "Not found." });
  return ok(db.registrations.filter((r) => eligible(c, r)).map((r) => {
    const p = db.progress.find((x) => x.student_key === `r${r.id}` && x.course_id === c.id);
    const done = p ? p.lesson_ids.filter((i) => c.lessons.some((l) => l.id === i)).length : 0;
    return { student_id: r.id, name: r.name, standard: r.standard, target: r.target || "", done, total: c.lessons.length, percent: c.lessons.length ? Math.round((done / c.lessons.length) * 100) : 0 };
  }).sort((a, b) => b.percent - a.percent));
});
const myCourse = (c, db, key) => { const p = db.progress.find((x) => x.student_key === key && x.course_id === c.id); const done = p ? p.lesson_ids.filter((i) => c.lessons.some((l) => l.id === i)) : []; return { id: c.id, title: c.title, standard: c.standard, target: c.target, subject: c.subject, description: c.description, lessons: c.lessons, done_lesson_ids: done, percent: c.lessons.length ? Math.round((done.length / c.lessons.length) * 100) : 0 }; };
route("get", "/student/courses/", ({ uid }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  if (!s) return fail(403, { detail: "Students only." });
  return ok(db.courses.filter((c) => c.status === "Published" && c.branch_id === s.branch_id && c.standard === s.standard && (!c.target || c.target === s.target)).map((c) => myCourse(c, db, s.key)));
});
route("post", "/student/courses/:id/progress/", ({ m, uid, body }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  if (!s) return fail(403, { detail: "Students only." });
  const c = db.courses.find((x) => x.id === Number(m[1]) && x.status === "Published" && x.branch_id === s.branch_id && x.standard === s.standard && (!x.target || x.target === s.target));
  if (!c) return fail(404, { detail: "Not found." });
  if (!c.lessons.some((l) => l.id === Number(body.lesson_id))) return fail(400, { lesson_id: ["Unknown lesson."] });
  let p = db.progress.find((x) => x.student_key === s.key && x.course_id === c.id);
  if (!p) { p = { id: nextId(db.progress), student_key: s.key, course_id: c.id, lesson_ids: [] }; db.progress.push(p); }
  const lid = Number(body.lesson_id);
  p.lesson_ids = body.done ? [...new Set([...p.lesson_ids, lid])] : p.lesson_ids.filter((i) => i !== lid);
  saveDb(db);
  return ok(myCourse(c, db, s.key));
});

route("get", "/student/exams/:id/questions/", ({ m, uid }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  const t = db.tests.find((x) => x.id === Number(m[1]));
  if (!s || !t || !takeable(db, t, s)) return fail(404, { detail: "Not found." });
  if (db.attempts.some((x) => x.exam_id === t.id && x.student_key === s.key)) return fail(409, { detail: "You have already submitted this exam." });
  const st = examState(t);
  if (st !== "Live") return fail(403, { detail: st === "Closed" ? "This exam is closed." : `This exam starts on ${t.date}.` });
  const p = db.papers.find((x) => x.id === t.paper_id);
  return ok({ title: t.name, duration: p.duration, questions: p.question_ids.map((id) => db.questions.find((q) => q.id === id)).filter(Boolean).map((q) => ({ id: q.id, type: q.type || "MCQ", question: q.question, options: q.options || [], marks: q.marks })) });
});
route("post", "/student/exams/:id/submit/", ({ m, uid, body }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  const t = db.tests.find((x) => x.id === Number(m[1]));
  if (!s || !t || !takeable(db, t, s)) return fail(404, { detail: "Not found." });
  if (db.attempts.some((x) => x.exam_id === t.id && x.student_key === s.key)) return fail(409, { detail: "You have already submitted this exam." });
  if (examState(t) === "Scheduled") return fail(403, { detail: "This exam has not started yet." });
  const p = db.papers.find((x) => x.id === t.paper_id);
  const answers = body.answers || {};
  const review = p.question_ids.map((id) => db.questions.find((q) => q.id === id)).filter(Boolean).map((q) => {
    const given = answers[q.id];
    if (q.type === "Subjective") return { id: q.id, type: "Subjective", question: q.question, options: [], marks: q.marks, model_answer: q.model_answer || "", written: given == null ? "" : String(given), awarded: null };
    return { id: q.id, type: "MCQ", question: q.question, options: q.options, answer: q.answer, marks: q.marks, chosen: given === undefined || given === null ? null : Number(given) };
  });
  const a = scoreAttempt({ id: nextId(db.attempts), exam_id: t.id, student_key: s.key, student_name: s.name, standard: s.standard, submitted_on: new Date().toISOString(), review });
  db.attempts.push(a);
  note(db, `${s.name} submitted "${t.name}"${a.pending_review ? " — subjective answers need checking." : ` (${a.score}/${a.total}).`}`);
  saveDb(db);
  return ok(resultOut(a, db), 201);
});
route("get", "/student/exams/:id/result/", ({ m, uid }) => {
  const db = loadDb();
  const a = db.attempts.find((x) => x.exam_id === Number(m[1]) && x.student_key === uid);
  return a ? ok(resultOut(a, db)) : fail(404, { detail: "No result yet." });
});

/* ---- parent portal: the child's profile + published papers for the child's standard ---- */
route("get", "/parent/dashboard/", ({ uid }) => {
  const db = loadDb();
  const parent = String(uid).startsWith("p") && !String(uid).startsWith("pa") ? db.parents.find((p) => p.id === Number(String(uid).slice(1))) : null;
  const child = db.registrations.find((r) => r.id === (parent ? parent.student_id : db.registrations[0] && db.registrations[0].id)); // demo parent -> first student
  if (!child) return ok({ child: null, papers: [] });
  return ok({
    child: noPw(child),
    papers: db.papers.filter((p) => p.standard === child.standard && p.status === "Published").map((p) => paperOut(p, db)),
  });
});
route("post", "/enquiries/", ({ body }) => {
  if (!String(body.name || "").trim()) return fail(400, required("name"));
  if (!String(body.message || "").trim()) return fail(400, required("message"));
  return ok({ id: Date.now() }, 201);
});
route("post", "/auth/logout/", () => ok("", 204), 0);

/* ---- students ---- */
route("get", "/students/", ({ sc }) => ok(loadDb().students.filter((x) => own(x, sc))));
route("post", "/students/", ({ body }) => {
  if (!String(body.name || "").trim()) return fail(400, required("name"));
  if (body.phone && !/^\d{10}$/.test(body.phone)) return fail(400, { phone: ["Mobile number must be 10 digits."] });
  const db = loadDb();
  const s = { id: nextId(db.students), name: String(body.name).trim(), batch: body.batch, phone: body.phone || "" };
  db.students.push(s);
  note(db, `Student ${s.name} added.`);
  saveDb(db);
  return ok(s, 201);
});
route("delete", "/students/:id/", ({ m }) => {
  const db = loadDb();
  const id = Number(m[1]);
  if (!db.students.some((s) => s.id === id)) return fail(404, { detail: "Not found." });
  db.students = db.students.filter((s) => s.id !== id);
  saveDb(db);
  return ok("", 204);
});

/* ---- tests ---- */
route("get", "/tests/", ({ sc }) => { const db = loadDb(); return ok(db.tests.filter((t) => own(t, sc)).map((t) => testOut(t, db))); });
route("post", "/tests/", ({ body, sc }) => {
  if (!String(body.name || "").trim()) return fail(400, required("name"));
  if (!body.standard) return fail(400, { standard: ["Select the standard."] });
  const db = loadDb();
  const br = branchFor(db, sc, body);
  if (br.err) return fail(400, br.err);
  const paper = body.paper_id ? db.papers.find((p) => p.id === Number(body.paper_id)) : null;
  if (body.paper_id && (!paper || paper.status !== "Published" || paper.standard !== body.standard)) return fail(400, { paper_id: ["Choose a published question paper of the same standard."] });
  if (!paper && (!(Number(body.duration) >= 1) || !(Number(body.total_marks) >= 1))) return fail(400, { non_field_errors: ["Duration and total marks must be at least 1."] });
  const batchIds = (body.batch_ids || []).map(Number);
  if (batchIds.some((id) => !db.batches.some((b) => b.id === id && b.standard === body.standard))) return fail(400, { batch_ids: ["Choose batches of the same standard."] });
  const t = { id: nextId(db.tests), branch_id: br.id, name: String(body.name).trim(), type: body.type, batch: body.batch, standard: body.standard, paper_id: paper ? paper.id : null, batch_ids: batchIds, result_announced: false, date: body.date, duration: Number(body.duration) || 0, totalMarks: Number(body.total_marks) || 0, status: body.status || "Scheduled" };
  db.tests.push(t);
  note(db, `Test "${t.name}" created for Std ${t.standard}.`);
  if (t.status !== "Draft") notifyStudents(db, t, testNote(t));
  saveDb(db);
  return ok(testOut(t, db), 201);
});
route("patch", "/tests/:id/", ({ m, body, sc }) => {
  const db = loadDb();
  const t = db.tests.find((x) => x.id === Number(m[1]) && own(x, sc));
  if (!t) return fail(404, { detail: "Not found." });
  if (body.status) { if (t.status === "Draft" && body.status === "Scheduled") notifyStudents(db, t, testNote(t)); t.status = body.status; }
  if (body.result_announced !== undefined) {
    const was = t.result_announced;
    t.result_announced = Boolean(body.result_announced);
    if (t.result_announced) note(db, `Result of "${t.name}" announced to Std ${t.standard}.`);
    if (t.result_announced && !was) notifyStudents(db, t, `Result of "${t.name}" is announced. Check your marks in the Tests tab.`);
  }
  if (body.batch_ids !== undefined) {
    const ids = (body.batch_ids || []).map(Number);
    if (ids.some((id) => !db.batches.some((b) => b.id === id && b.standard === t.standard))) return fail(400, { batch_ids: ["Choose batches of the same standard."] });
    t.batch_ids = ids;
  }
  saveDb(db);
  return ok(testOut(t, db));
});
route("delete", "/tests/:id/", ({ m, sc }) => {
  const db = loadDb();
  const id = Number(m[1]);
  if (!db.tests.some((t) => t.id === id && own(t, sc))) return fail(404, { detail: "Not found." });
  db.tests = db.tests.filter((t) => t.id !== id);
  db.attempts = db.attempts.filter((a) => a.exam_id !== id);
  saveDb(db);
  return ok("", 204);
});

/* ---- results (demo results are generated from students + tests) ---- */
route("get", "/results/", ({ sc }) => {
  const db = loadDb();
  return ok(computeResults(db.students.filter((x) => own(x, sc)), db.tests.filter((x) => own(x, sc))).map((r) => ({ test_id: r.testId, student_id: r.studentId, score: r.score, marks: r.marks, subjects: r.subjects })));
});

/* ---- settings ---- */
route("get", "/settings/", () => ok(settingsOut(loadDb().settings)));
route("patch", "/settings/", ({ body }) => {
  const db = loadDb();
  if (body.institute !== undefined && !String(body.institute).trim()) return fail(400, { institute: ["Institute name is required."] });
  if (body.email !== undefined && !/^\S+@\S+\.\S+$/.test(body.email)) return fail(400, { email: ["Enter a valid email address."] });
  if (body.low_score_below !== undefined && !(body.low_score_below >= 1 && body.low_score_below <= 100)) return fail(400, { low_score_below: ["Must be between 1 and 100."] });
  const map = { institute: "institute", email: "email", phone: "phone", low_score_below: "lowScoreBelow", notify_email: "notifyEmail", notify_low_score: "notifyLowScore" };
  Object.entries(map).forEach(([api, ui]) => { if (body[api] !== undefined) db.settings[ui] = body[api]; });
  saveDb(db);
  return ok(settingsOut(db.settings));
});

/* ---- notifications ---- */
route("get", "/notifications/", () => ok(loadDb().notifications));
route("post", "/notifications/mark-all-read/", () => {
  const db = loadDb();
  db.notifications = db.notifications.map((n) => ({ ...n, read: true }));
  saveDb(db);
  return ok("", 204);
});

/* ---- student portal / leads / demo ---- */
route("get", "/student/dashboard/", ({ uid }) => {
  const id = regIdOf(uid);
  return ok(id ? { ...seedStudentPortal, unread_notifications: (loadDb().student_notifications || []).filter((n) => n.student_ids.includes(id) && !n.read_by.includes(id)).length } : seedStudentPortal);
});
/* manual "Notify students" button + the student's own notification list */
route("post", "/tests/:id/notify/", ({ m, sc }) => {
  const db = loadDb();
  const t = db.tests.find((x) => x.id === Number(m[1]) && own(x, sc));
  if (!t) return fail(404, { detail: "Not found." });
  if (t.status === "Draft") return fail(400, { detail: "Publish the test first, then notify students." });
  const sent = notifyStudents(db, t, testNote(t));
  if (!sent) return fail(400, { detail: `No active students found in Std ${t.standard}${(t.batch_ids || []).length ? " (selected batches)" : ""}.` });
  saveDb(db);
  return ok({ sent });
});

/* Teacher -> Send notification: free message to a whole standard, selected batches or selected students.
   Students get it under the bell icon; parents see it in View Notices (they read their child's alerts). */
route("post", "/notifications/send/", ({ body, sc }) => {
  const db = loadDb();
  const title = String(body.title || "").trim(), message = String(body.message || "").trim();
  if (!title) return fail(400, required("title"));
  if (!message) return fail(400, required("message"));
  if (message.length > 1000) return fail(400, { message: ["Keep the message under 1000 characters."] });
  const pool = db.registrations.filter((r) => r.status !== "Inactive" && own(r, sc));
  let ids = [];
  if (body.audience === "students") ids = (body.student_ids || []).map(Number).filter((id) => pool.some((r) => r.id === id));
  else if (body.audience === "batches") { const bids = (body.batch_ids || []).map(Number); ids = pool.filter((r) => db.batches.some((b) => bids.includes(b.id) && (b.student_ids || []).includes(r.id))).map((r) => r.id); }
  else if (body.audience === "standard") ids = pool.filter((r) => r.standard === body.standard).map((r) => r.id);
  else return fail(400, { audience: ["Choose who should receive the notification."] });
  ids = [...new Set(ids)];
  if (!ids.length) return fail(400, { detail: "No active students found for this selection." });
  db.student_notifications = db.student_notifications || [];
  db.student_notifications.unshift({ id: nextId(db.student_notifications), student_ids: ids, test_id: 0, title, text: `${title}: ${message}`, created_on: new Date().toISOString(), read_by: [] });
  db.student_notifications = db.student_notifications.slice(0, 200);
  saveDb(db);
  return ok({ sent: ids.length });
});
const regIdOf = (uid) => (String(uid).startsWith("r") ? Number(String(uid).slice(1)) : 0);
route("get", "/student/notifications/", ({ uid }) => {
  const id = regIdOf(uid);
  return ok((loadDb().student_notifications || []).filter((n) => n.student_ids.includes(id)).map((n) => ({ id: n.id, text: n.text, created_on: n.created_on, read: n.read_by.includes(id) })));
});
route("post", "/student/notifications/mark-all-read/", ({ uid }) => {
  const db = loadDb(), id = regIdOf(uid);
  (db.student_notifications || []).forEach((n) => { if (n.student_ids.includes(id) && !n.read_by.includes(id)) n.read_by.push(id); });
  saveDb(db);
  return ok("", 204);
});

route("post", "/leads/demo-requests/", ({ body }) => {
  if (!String(body.name || "").trim() || !String(body.phone || "").trim()) return fail(400, { non_field_errors: ["Name and mobile number are required."] });
  return ok({ id: Date.now() }, 201);
});
route("post", "/demo/reset/", () => { resetDb(); return ok("", 204); }, 0);


/* ---- attendance: one record per student per day. Marked by hand (Manual) or imported from a biometric device log (Biometric). ----
   Student = registration id. Status: Present / Absent / Late / Leave. See docs/API_CONTRACT.md (Attendance). */
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // the institute's own calendar day (not UTC)
const ATT_STATUS = ["Present", "Absent", "Late", "Leave"];
const attOut = (a) => ({ id: a.id, student_id: a.student_id, date: a.date, status: a.status, in_time: a.in_time || "", out_time: a.out_time || "", source: a.source || "Manual", note: a.note || "" });
const isoDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(Date.parse(`${v}T00:00:00`));
const attStudents = (db, sc) => db.registrations.filter((r) => own(r, sc));
const normId = (v) => { const s = String(v == null ? "" : v).trim().toLowerCase(); return /^\d+$/.test(s) ? String(Number(s)) : s; };
/* a device ID belongs to the student whose Biometric ID matches; if none, the mobile number, then the registration number */
const findByDeviceId = (students, devId) => students.find((r) => r.biometric_id && normId(r.biometric_id) === normId(devId)) || students.find((r) => r.mobile === String(devId).trim()) || students.find((r) => String(r.id) === normId(devId));
const upsertAtt = (db, student, date, patch) => {
  const cur = db.attendance.find((a) => a.student_id === student.id && a.date === date);
  if (cur) { Object.assign(cur, patch); return { rec: cur, created: false }; }
  const rec = { id: nextId(db.attendance), branch_id: student.branch_id, student_id: student.id, date, status: "Absent", in_time: "", out_time: "", source: "Manual", note: "", ...patch };
  db.attendance.push(rec);
  return { rec, created: true };
};
route("get", "/attendance/", ({ sc, params }) => {
  const db = loadDb();
  const ids = new Set(attStudents(db, sc).map((r) => r.id));
  return ok(db.attendance.filter((a) => ids.has(a.student_id) && (!params.from || a.date >= params.from) && (!params.to || a.date <= params.to)).map(attOut));
});
route("post", "/attendance/mark/", ({ body, sc }) => {
  const db = loadDb();
  if (!isoDate(body.date)) return fail(400, { date: ["Choose a valid date."] });
  if (body.date > localToday()) return fail(400, { date: ["Attendance cannot be marked for a future date."] });
  const list = Array.isArray(body.records) ? body.records : [];
  if (!list.length) return fail(400, { records: ["Nothing to save."] });
  const students = attStudents(db, sc);
  let saved = 0;
  for (const r of list) {
    const st = students.find((x) => x.id === Number(r.student_id));
    if (!st) return fail(400, { records: ["A student in the list was not found."] });
    if (!ATT_STATUS.includes(r.status)) return fail(400, { records: [`Invalid status for ${st.name}.`] });
    upsertAtt(db, st, body.date, { status: r.status, note: String(r.note || "").slice(0, 200), source: "Manual" });
    saved++;
  }
  saveDb(db);
  return ok({ saved });
});
route("post", "/attendance/import/", ({ body, sc }) => {
  const db = loadDb();
  if (!sc && db.branches.length > 1) return fail(400, { detail: "Select a branch in the top bar before importing." });
  const punches = Array.isArray(body.punches) ? body.punches : [];
  if (!punches.length) return fail(400, { punches: ["The file has no attendance rows."] });
  const lateAfter = /^\d{2}:\d{2}$/.test(body.late_after || "") ? body.late_after : "";
  const students = attStudents(db, sc).filter((r) => r.status !== "Inactive");
  const groups = new Map(); // "studentId|date" -> times
  const unknown = new Set();
  let skipped = 0;
  for (const p of punches) {
    const date = String(p.timestamp || "").slice(0, 10), time = String(p.timestamp || "").slice(11, 16);
    const st = isoDate(date) && date <= localToday() ? findByDeviceId(students, p.biometric_id) : null;
    if (!st) { skipped++; if (isoDate(date) && date <= localToday()) unknown.add(String(p.biometric_id)); continue; }
    const k = `${st.id}|${date}`;
    if (!groups.has(k)) groups.set(k, { st, date, times: [] });
    if (time) groups.get(k).times.push(time);
  }
  let created = 0, updated = 0;
  const dates = new Set();
  groups.forEach(({ st, date, times }) => {
    times.sort();
    const first = times[0] || "", last = times.length > 1 ? times[times.length - 1] : "";
    const res = upsertAtt(db, st, date, { status: lateAfter && first && first > lateAfter ? "Late" : "Present", in_time: first, out_time: last, source: "Biometric" });
    if (res.created) created++; else updated++;
    dates.add(date);
  });
  let absent = 0;
  if (body.mark_absent !== false) dates.forEach((date) => students.forEach((st) => {
    if ((st.registered_on || "") > date || db.attendance.some((a) => a.student_id === st.id && a.date === date)) return; // never overwrite an existing record
    upsertAtt(db, st, date, { status: "Absent", source: "Biometric" });
    absent++;
  }));
  saveDb(db);
  return ok({ students_matched: new Set([...groups.values()].map((g) => g.st.id)).size, created, updated, absent_marked: absent, days: dates.size, skipped_rows: skipped, unknown_ids: [...unknown].slice(0, 50) });
});
route("get", "/student/attendance/", ({ uid }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  const id = s && String(s.key).startsWith("r") ? Number(String(s.key).slice(1)) : 0;
  return ok(db.attendance.filter((a) => a.student_id === id).map(attOut));
});
route("get", "/parent/attendance/", ({ uid }) => {
  const db = loadDb();
  const parent = String(uid).startsWith("p") && !String(uid).startsWith("pa") ? db.parents.find((p) => p.id === Number(String(uid).slice(1))) : null;
  const id = parent ? parent.student_id : db.registrations[0] && db.registrations[0].id;
  return ok(db.attendance.filter((a) => a.student_id === id).map(attOut));
});

/* ---- student portal extras: profile, mock tests (self practice), self attendance, messages to the institute ---- */
const regOf = (db, s) => (s && String(s.key).startsWith("r") ? db.registrations.find((x) => x.id === Number(String(s.key).slice(1))) : null);
route("get", "/student/profile/", ({ uid }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  if (!s) return fail(403, { detail: "Students only." });
  const r = regOf(db, s);
  const br = db.branches.find((b) => b.id === s.branch_id);
  if (!r) return ok({ name: s.name, standard: s.standard, target: "", medium: "", mobile: "", email: "", parent_name: "", parent_mobile: "", school_name: "", date_of_birth: "", username: "abhijeet", registered_on: "", biometric_id: "", branch_name: br ? br.name : "" });
  const { password: _pw, ...rest } = r;
  return ok({ ...rest, target: r.target || "", branch_name: br ? br.name : "" });
});

/* MOCK TESTS = every Published question paper of the student's standard, MCQ part only, instant result, unlimited attempts. */
const mockPapers = (db, s) => db.papers.filter((p) => p.standard === s.standard && p.status === "Published").map((p) => ({ p, qs: p.question_ids.map((id) => db.questions.find((q) => q.id === id)).filter((q) => q && q.type !== "Subjective") })).filter((x) => x.qs.length);
route("get", "/student/mock-tests/", ({ uid }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  if (!s) return fail(403, { detail: "Students only." });
  const mine = (db.mock_attempts || []).filter((a) => a.student_key === s.key);
  return ok(mockPapers(db, s).map(({ p, qs }) => {
    const tries = mine.filter((a) => a.paper_id === p.id);
    const last = tries[tries.length - 1];
    return { id: p.id, title: p.title, subject: p.subject, standard: p.standard, duration: p.duration || 30, question_count: qs.length, total_marks: qs.reduce((x, q) => x + q.marks, 0), attempts: tries.length, best: tries.length ? Math.max(...tries.map((a) => a.score)) : null, last: last ? { score: last.score, total: last.total, date: last.submitted_on } : null };
  }));
});
route("get", "/student/mock-tests/:id/questions/", ({ m, uid }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  const hit = s && mockPapers(db, s).find((x) => x.p.id === Number(m[1]));
  if (!hit) return fail(404, { detail: "Not found." });
  return ok({ title: hit.p.title, duration: hit.p.duration || 30, questions: hit.qs.map((q) => ({ id: q.id, type: "MCQ", question: q.question, options: q.options, marks: q.marks })) });
});
route("post", "/student/mock-tests/:id/submit/", ({ m, uid, body }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  const hit = s && mockPapers(db, s).find((x) => x.p.id === Number(m[1]));
  if (!hit) return fail(404, { detail: "Not found." });
  const answers = body.answers || {};
  const review = hit.qs.map((q) => { const g = answers[q.id]; return { id: q.id, type: "MCQ", question: q.question, options: q.options, answer: q.answer, marks: q.marks, chosen: g === undefined || g === null ? null : Number(g) }; });
  const correct = review.filter((r) => r.chosen === r.answer).length, unattempted = review.filter((r) => r.chosen === null).length;
  const a = { id: nextId(db.mock_attempts || []), paper_id: hit.p.id, student_key: s.key, submitted_on: new Date().toISOString(), score: review.filter((r) => r.chosen === r.answer).reduce((x, r) => x + r.marks, 0), total: review.reduce((x, r) => x + r.marks, 0), correct, wrong: review.length - correct - unattempted, unattempted };
  db.mock_attempts = [...(db.mock_attempts || []), a];
  saveDb(db);
  return ok({ ...a, title: hit.p.title, review }, 201);
});

/* student marks his own attendance for TODAY (one tap). Never overwrites a record the teacher / biometric machine already made. */
route("post", "/student/attendance/mark/", ({ uid }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  const r = regOf(db, s);
  if (!r) return fail(403, { detail: "Only registered students can mark attendance." });
  if (r.status === "Inactive") return fail(403, { detail: "Your account is inactive. Please contact the institute." });
  const date = localToday();
  const cur = db.attendance.find((a) => a.student_id === r.id && a.date === date);
  if (cur) return fail(409, { detail: `Today's attendance is already marked: ${cur.status}${cur.in_time ? ` (in ${cur.in_time})` : ""}.` });
  const d = new Date(), hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const { rec } = upsertAtt(db, r, date, { status: "Present", in_time: hhmm, source: "Self" });
  saveDb(db);
  return ok(attOut(rec), 201);
});

/* messages: student -> institute (admin / staff see them under Dashboard -> Messages and can reply) */
const msgOut = (x) => ({ id: x.id, student_id: x.student_key, student_name: x.student_name, from_role: x.from_role || "Student", sender_name: x.sender_name || x.student_name, standard: x.standard, subject: x.subject, text: x.text, created_on: x.created_on, reply: x.reply || "", replied_on: x.replied_on || "" });
route("get", "/student/messages/", ({ uid }) => ok((loadDb().messages || []).filter((x) => x.student_key === uid).map(msgOut).reverse()));
route("post", "/student/messages/", ({ uid, body }) => {
  const db = loadDb();
  const s = studentOf(db, uid);
  if (!s) return fail(403, { detail: "Students only." });
  if (blank(body.subject)) return fail(400, required("subject"));
  if (blank(body.text)) return fail(400, required("text"));
  if (String(body.text).length > 1000) return fail(400, { text: ["Keep the message under 1000 characters."] });
  db.messages = db.messages || [];
  const x = { id: nextId(db.messages), branch_id: s.branch_id, student_key: s.key, student_name: s.name, standard: s.standard, subject: String(body.subject).trim().slice(0, 100), text: String(body.text).trim(), created_on: new Date().toISOString(), reply: "", replied_on: "" };
  db.messages.push(x);
  note(db, `New message from ${s.name}: ${x.subject}`);
  saveDb(db);
  return ok(msgOut(x), 201);
});
route("get", "/messages/", ({ sc }) => ok((loadDb().messages || []).filter((x) => own(x, sc)).map(msgOut).reverse()));
route("patch", "/messages/:id/", ({ m, body, sc }) => {
  const db = loadDb();
  const x = (db.messages || []).find((y) => y.id === Number(m[1]) && own(y, sc));
  if (!x) return fail(404, { detail: "Not found." });
  if (blank(body.reply)) return fail(400, required("reply"));
  x.reply = String(body.reply).trim().slice(0, 1000);
  x.replied_on = new Date().toISOString();
  saveDb(db);
  return ok(msgOut(x));
});
route("delete", "/messages/:id/", ({ m, sc }) => {
  const db = loadDb();
  const i = (db.messages || []).findIndex((y) => y.id === Number(m[1]) && own(y, sc));
  if (i < 0) return fail(404, { detail: "Not found." });
  db.messages.splice(i, 1);
  saveDb(db);
  return ok("", 204);
});


/* ---- PARENT PORTAL: profile, results, attendance (above), notices, messages — all limited to the parent's own child ----
   Parent ids: registered parents are "p<id>" (linked by student_id), the demo parent is "pa1" (linked to the first student). */
const parentCtx = (db, uid) => {
  const k = String(uid);
  const parent = k === "pa1" ? DEMO_ACCOUNTS.find((a) => a.id === "pa1") : /^p\d+$/.test(k) ? db.parents.find((x) => x.id === Number(k.slice(1))) : null;
  if (!parent) return null;
  const child = db.registrations.find((r) => r.id === (parent.student_id || (db.registrations[0] || {}).id)) || null;
  return { parent, child };
};
const notParent = () => fail(403, { detail: "Parents only." });

route("get", "/parent/profile/", ({ uid }) => {
  const db = loadDb();
  const c = parentCtx(db, uid);
  if (!c) return notParent();
  const parent = { name: c.parent.name, mobile: c.parent.mobile || "", email: c.parent.email || "", username: c.parent.username };
  return ok({ parent, child: c.child ? { ...noPw(c.child), target: c.child.target || "", branch_name: branchName(db, c.child.branch_id) } : null });
});

/* results of the child's online exams. Marks / rank only after the admin has announced the result (same rule as for the student). */
route("get", "/parent/results/", ({ uid }) => {
  const db = loadDb();
  const c = parentCtx(db, uid);
  if (!c) return notParent();
  if (!c.child) return ok({ results: [], pending: [] });
  const key = `r${c.child.id}`;
  const mine = db.attempts.filter((a) => a.student_key === key);
  const results = mine.map((a) => {
    const t = db.tests.find((x) => x.id === a.exam_id) || {};
    const pp = db.papers.find((x) => x.id === t.paper_id) || {};
    const base = { id: a.id, exam_title: t.name || "", subject: pp.subject || "", test_date: t.date || "", submitted_on: a.submitted_on, announced: Boolean(t.result_announced) };
    if (!t.result_announced) return base;
    const all = db.attempts.filter((x) => x.exam_id === a.exam_id);
    return { ...base, score: a.score, total: a.total, percent: a.total ? Math.round((a.score / a.total) * 100) : 0, correct: a.correct, wrong: a.wrong, unattempted: a.unattempted, rank: all.filter((x) => x.score > a.score).length + 1, appeared: all.length };
  }).sort((x, y) => String(y.submitted_on).localeCompare(String(x.submitted_on)));
  const s = studentOf(db, key);
  const pending = s ? db.tests.filter((t) => takeable(db, t, s) && !mine.some((a) => a.exam_id === t.id)).map((t) => { const o = testOut(t, db); return { id: t.id, title: t.name, subject: o.subject, date: t.date, status: examState(t), total_marks: o.total_marks }; }) : [];
  return ok({ results, pending });
});

/* notices: written by the admin (Dashboard -> Notices) for Parents / Everyone, optionally for one standard only; plus the test alerts sent to the child */
route("get", "/parent/notices/", ({ uid }) => {
  const db = loadDb();
  const c = parentCtx(db, uid);
  if (!c) return notParent();
  if (!c.child) return ok([]);
  const ch = c.child;
  const notices = (db.notices || []).filter((n) => n.audience !== "Students" && (!n.branch_id || n.branch_id === ch.branch_id) && (!n.standard || n.standard === ch.standard))
    .map((n) => ({ id: `n${n.id}`, kind: "Notice", title: n.title, text: n.text, pinned: Boolean(n.pinned), created_on: n.created_on }));
  const alerts = (db.student_notifications || []).filter((n) => n.student_ids.includes(ch.id)).map((n) => ({ id: `t${n.id}`, kind: "Test", title: "Test alert", text: n.text, pinned: false, created_on: n.created_on }));
  return ok([...notices, ...alerts].sort((x, y) => (y.pinned - x.pinned) || String(y.created_on).localeCompare(String(x.created_on))));
});
crud("/notices/", "notices", {
  scoped: true,
  fields: ["title", "text", "audience", "standard", "pinned"],
  defaults: () => ({ audience: "Parents", standard: "", pinned: false, created_on: new Date().toISOString() }),
  check: (n) => {
    if (blank(n.title)) return required("title");
    if (blank(n.text)) return required("text");
    if (String(n.text).length > 2000) return { text: ["Keep the notice under 2000 characters."] };
    if (!["Parents", "Students", "Everyone"].includes(n.audience)) return { audience: ["Choose who should see this notice."] };
    n.title = String(n.title).trim().slice(0, 120); n.text = String(n.text).trim(); n.standard = n.standard || ""; n.pinned = Boolean(n.pinned);
    return null;
  },
});

/* messages: parent -> institute (admin / staff see them under Dashboard -> Messages, mark "Parent", and can reply) */
route("get", "/parent/messages/", ({ uid }) => ok((loadDb().messages || []).filter((x) => x.from_role === "Parent" && String(x.student_key) === String(uid)).map(msgOut).reverse()));
route("post", "/parent/messages/", ({ uid, body }) => {
  const db = loadDb();
  const c = parentCtx(db, uid);
  if (!c) return notParent();
  if (!c.child) return fail(400, { detail: "No child is linked to this account yet. Please contact the institute." });
  if (blank(body.subject)) return fail(400, required("subject"));
  if (blank(body.text)) return fail(400, required("text"));
  if (String(body.text).length > 1000) return fail(400, { text: ["Keep the message under 1000 characters."] });
  db.messages = db.messages || [];
  const x = { id: nextId(db.messages), branch_id: c.child.branch_id, student_key: String(uid), student_name: c.child.name, standard: c.child.standard, from_role: "Parent", sender_name: `${c.parent.name} (Parent)`, subject: String(body.subject).trim().slice(0, 100), text: String(body.text).trim(), created_on: new Date().toISOString(), reply: "", replied_on: "" };
  db.messages.push(x);
  note(db, `New message from parent of ${c.child.name}: ${x.subject}`);
  saveDb(db);
  return ok(msgOut(x), 201);
});

/* ---- adapter ---- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const parseBody = (d) => { if (!d) return {}; if (typeof d === "string") { try { return JSON.parse(d); } catch { return {}; } } return d; };

export async function mockAdapter(config) {
  const method = (config.method || "get").toLowerCase();
  const path = (config.url || "").split("?")[0];
  let m = null;
  const r = routes.find((x) => x.method === method && (m = path.match(x.re)));

  await sleep(r && r.delay !== undefined ? r.delay : env.MOCK_DELAY_MS);

  let out;
  if (!r) out = fail(404, { detail: "Not found." });
  else {
    const h = config.headers || {};
    const auth = String(h.Authorization || (h.get && h.get("Authorization")) || "");
    const uid = auth.replace(/^\S+\s/, "").replace("mock-token-", "");
    const db0 = loadDb(); const vw = viewer(db0, uid, h["X-Branch-Id"] || (h.get && h.get("X-Branch-Id")));
    try { out = r.handler({ m, body: parseBody(config.data), params: config.params || {}, uid, sc: vw.sc, role: vw.role }); } catch { out = fail(500, { detail: "Mock server error." }); }
  }

  const response = { data: out.data, status: out.status, statusText: String(out.status), headers: {}, config, request: {} };
  if (out.status >= 200 && out.status < 300) return response;
  throw new AxiosError(`Request failed with status code ${out.status}`, out.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, {}, response);
}
