/* Attendance helpers (pure functions, no React): reading a biometric device export (CSV / TXT / DAT / XLSX),
   guessing its columns, turning rows into punches, matching device IDs to students and building report numbers.
   The real device software differs a lot (ZKTeco, eSSL, Realtime, Matrix...) so every step is forgiving
   and the Import screen lets the admin correct the column choice before anything is saved. */

export const STATUSES = ["Present", "Absent", "Late", "Leave"];
export const STATUS_SHORT = { Present: "P", Absent: "A", Late: "L", Leave: "Lv" };
export const STATUS_CLASS = { Present: "p", Absent: "a", Late: "l", Leave: "v" };

/* ---------------------------------------------------------------- reading the file */

/* Splits text into rows of cells. Handles quotes, BOM, CRLF and picks the delimiter itself. */
export function parseDelimited(text) {
  const clean = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return [];
  const sample = lines.slice(0, 10);
  const cands = [",", "\t", ";", "|"];
  const score = (d) => { const n = sample.map((l) => l.split(d).length - 1); return n[0] > 0 && n.every((x) => x === n[0]) ? n[0] + 1000 : Math.min(...n); };
  let delim = cands.reduce((best, d) => (score(d) > score(best) ? d : best), cands[0]);
  const useSpaces = score(delim) <= 0; // e.g. "1   2026-10-01 08:55:02   1   0" (some .dat exports)
  const rows = [];
  for (const line of lines) {
    if (useSpaces) { rows.push(line.trim().split(/\s+/)); continue; }
    const out = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    out.push(cur.trim());
    rows.push(out);
  }
  const width = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => { while (r.length < width) r.push(""); return r; });
}

/* ---------------------------------------------------------------- dates & times */

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const p2 = (n) => String(n).padStart(2, "0");
const validYMD = (y, m, d) => { if (m < 1 || m > 12 || d < 1 || d > 31) return false; const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
const fixYear = (y) => (y < 100 ? 2000 + y : y);
const TIME = String.raw`(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp][Mm])?`;
const timeOf = (h, mi, ap) => {
  let hh = Number(h); const mm = Number(mi);
  if (ap) { const pm = /p/i.test(ap); if (hh < 1 || hh > 12) return null; hh = (hh % 12) + (pm ? 12 : 0); }
  return hh > 23 || mm > 59 ? null : `${p2(hh)}:${p2(mm)}`;
};
const RE_ISO = new RegExp(String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T]+${TIME})?\s*Z?$`);
const RE_DMY = new RegExp(String.raw`^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T]+${TIME})?$`);
const RE_MON = new RegExp(String.raw`^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ,]+(\d{2,4})(?:[ T]+${TIME})?$`);
const RE_TIME = new RegExp(String.raw`^${TIME}$`);

/* "2026-10-05 09:12:44", "05/10/2026 9:12 AM", "5-Oct-2026" ... -> { date: "YYYY-MM-DD" | "", time: "HH:MM" | "" } or null.
   dayFirst decides 03/04/2026 (India = day first). A value like 25/04/2026 is always read correctly. */
export function parseStamp(value, dayFirst = true) {
  const s = String(value == null ? "" : value).trim();
  if (!s) return null;
  let m = s.match(RE_TIME);
  if (m) { const t = timeOf(m[1], m[2], m[4]); return t ? { date: "", time: t } : null; }
  m = s.match(RE_ISO);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (!validYMD(y, mo, d)) return null;
    const t = m[4] !== undefined ? timeOf(m[4], m[5], m[7]) : "";
    return t === null ? null : { date: `${y}-${p2(mo)}-${p2(d)}`, time: t };
  }
  m = s.match(RE_DMY);
  if (m) {
    let a = Number(m[1]), b = Number(m[2]);
    const y = fixYear(Number(m[3]));
    let d = dayFirst ? a : b, mo = dayFirst ? b : a;
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // only one reading is possible
    if (!validYMD(y, mo, d)) return null;
    const t = m[4] !== undefined ? timeOf(m[4], m[5], m[7]) : "";
    return t === null ? null : { date: `${y}-${p2(mo)}-${p2(d)}`, time: t };
  }
  m = s.match(RE_MON);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const d = Number(m[1]), y = fixYear(Number(m[3]));
    if (!mo || !validYMD(y, mo, d)) return null;
    const t = m[4] !== undefined ? timeOf(m[4], m[5], m[7]) : "";
    return t === null ? null : { date: `${y}-${p2(mo)}-${p2(d)}`, time: t };
  }
  return null;
}

/* ---------------------------------------------------------------- columns */

const NONE = -1;
export const NO_COLUMN = NONE;

/* Looks at the header names and the first rows and proposes which column is what. */
export function guessMapping(rows, hasHeader) {
  const width = rows.length ? rows[0].length : 0;
  const head = hasHeader ? rows[0].map((h) => String(h).toLowerCase().trim()) : [];
  const body = rows.slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + 40);
  const col = (i) => body.map((r) => r[i]);
  const frac = (i, fn) => { const v = col(i).filter((x) => String(x).trim() !== ""); return v.length ? v.filter(fn).length / v.length : 0; };
  const isDT = (x) => { const p = parseStamp(x); return Boolean(p && p.date && p.time); };
  const isDate = (x) => { const p = parseStamp(x); return Boolean(p && p.date); };
  const isTime = (x) => { const p = parseStamp(x); return Boolean(p && !p.date && p.time); };
  const find = (re, ok = () => true) => { for (let i = 0; i < width; i++) if (head[i] && re.test(head[i]) && ok(i)) return i; return NONE; };

  let dt = NONE, date = NONE, time = NONE, out = NONE, id = NONE;
  for (let i = 0; i < width; i++) if (dt === NONE && frac(i, isDT) >= 0.8) dt = i;
  if (dt === NONE) {
    for (let i = 0; i < width; i++) if (date === NONE && frac(i, isDate) >= 0.8) date = i;
    const times = [];
    for (let i = 0; i < width; i++) if (frac(i, isTime) >= 0.8) times.push(i);
    if (times.length) {
      const named = times.find((i) => /in|check|punch|first|arriv/.test(head[i] || ""));
      time = named !== undefined ? named : times[0];
      const o = times.find((i) => i !== time && /out|last|leav|depart/.test(head[i] || ""));
      if (o !== undefined) out = o;
    }
  }
  const used = new Set([dt, date, time, out]);
  id = find(/(user\s*-?\s*id|userid|emp(loyee)?\s*-?\s*(code|id|no)|enroll|ac-?\s*no|person\s*id|badge|card\s*(no|id)|device\s*user|^id$|^pin$|^no\.?$|biometric)/, (i) => !used.has(i));
  if (id === NONE) for (let i = 0; i < width; i++) if (!used.has(i) && frac(i, (x) => /^[A-Za-z0-9_.-]{1,20}$/.test(x)) >= 0.9 && frac(i, (x) => !isDate(x) && !isTime(x)) >= 0.9) { id = i; break; }
  return { id, dt, date, time, out };
}

/* Does the first row look like column titles? (device logs without a title row start straight with data) */
export function looksLikeHeader(rows) {
  if (!rows.length) return false;
  return !rows[0].some((c) => parseStamp(c)) && rows[0].some((c) => /[A-Za-z]/.test(c));
}

/* Rows + chosen columns -> punches [{ biometricId, date, time }]. */
export function buildPunches(rows, hasHeader, map, dayFirst = true) {
  const punches = [];
  const bad = [];
  rows.slice(hasHeader ? 1 : 0).forEach((r, idx) => {
    const idv = map.id === NONE ? "" : String(r[map.id] || "").trim();
    let st = null;
    if (map.dt !== NONE) st = parseStamp(r[map.dt], dayFirst);
    else if (map.date !== NONE) {
      const d = parseStamp(r[map.date], dayFirst);
      const t = map.time !== NONE ? parseStamp(r[map.time], dayFirst) : null;
      if (d && d.date) st = { date: d.date, time: (t && t.time) || d.time || "" };
    }
    if (!idv || !st || !st.date) { if (r.some((c) => String(c).trim())) bad.push({ line: idx + 1 + (hasHeader ? 1 : 0), row: r }); return; }
    punches.push({ biometricId: idv, date: st.date, time: st.time });
    if (map.out !== NONE && map.dt === NONE) {
      const o = parseStamp(r[map.out], dayFirst);
      if (o && o.time) punches.push({ biometricId: idv, date: st.date, time: o.time });
    }
  });
  return { punches, bad };
}

/* ---------------------------------------------------------------- matching device IDs to students */

const norm = (v) => { const s = String(v == null ? "" : v).trim().toLowerCase(); return /^\d+$/.test(s) ? String(Number(s)) : s; }; // "007" == "7"

/* Finds the student of a device ID: Biometric ID field first, then registration number, then mobile number. */
export function makeMatcher(students) {
  const byBio = new Map(), byId = new Map(), byMobile = new Map();
  students.forEach((s) => {
    if (s.biometricId) byBio.set(norm(s.biometricId), s);
    byId.set(String(s.id), s);
    if (s.mobile) byMobile.set(String(s.mobile), s);
  });
  return (devId) => byBio.get(norm(devId)) || byMobile.get(String(devId).trim()) || byId.get(norm(devId)) || null;
}

/* ---------------------------------------------------------------- dates for the report */

export const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
export const monthKey = (iso) => iso.slice(0, 7);
export const daysInMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
export const isSunday = (ym, d) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, d).getDay() === 0; };
export const monthLabel = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); };
export const monthRange = (ym) => ({ from: `${ym}-01`, to: `${ym}-${p2(daysInMonth(ym))}` });

/* attendance % = (Present + Late) / (Present + Late + Absent + Leave) of the days that were marked for that student. */
export function summarize(list) {
  const c = { Present: 0, Absent: 0, Late: 0, Leave: 0 };
  list.forEach((r) => { if (c[r.status] !== undefined) c[r.status]++; });
  const total = c.Present + c.Absent + c.Late + c.Leave;
  return { ...c, total, percent: total ? Math.round(((c.Present + c.Late) / total) * 1000) / 10 : null };
}

/* Student-wise table for one month: [{ student, byDay: {1:"Present",...}, sum }] */
export function buildMonthReport(students, records, ym) {
  const idx = new Map();
  records.forEach((r) => { if (monthKey(r.date) === ym) idx.set(`${r.studentId}|${Number(r.date.slice(8, 10))}`, r.status); });
  return students.map((s) => {
    const byDay = {};
    const mine = [];
    for (let d = 1; d <= daysInMonth(ym); d++) { const st = idx.get(`${s.id}|${d}`); if (st) { byDay[d] = st; mine.push({ status: st }); } }
    return { student: s, byDay, sum: summarize(mine) };
  });
}

/* Day-wise table for one month: one row per date that has any record. */
export function buildDayReport(students, records, ym) {
  const ids = new Set(students.map((s) => s.id));
  const days = new Map();
  records.filter((r) => monthKey(r.date) === ym && ids.has(r.studentId)).forEach((r) => { if (!days.has(r.date)) days.set(r.date, []); days.get(r.date).push(r); });
  return [...days.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, list]) => ({ date, ...summarize(list), roster: students.length }));
}

/* Sample file the admin can download to see the expected layout. */
export function sampleCsv(students) {
  const lines = ["User ID,Date/Time"];
  const base = new Date();
  const day = (off) => { const d = new Date(base); d.setDate(d.getDate() - off); return d; };
  const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const list = students.length ? students : [{ id: 1, biometricId: "101" }, { id: 2, biometricId: "102" }];
  [2, 1].forEach((off) => list.slice(0, 5).forEach((s, i) => {
    const idv = s.biometricId || s.id;
    lines.push(`${idv},${iso(day(off))} 08:${p2(40 + (i % 3) * 8)}:12`);
    lines.push(`${idv},${iso(day(off))} 13:${p2(10 + i * 3)}:40`);
  }));
  return lines.join("\n");
}
