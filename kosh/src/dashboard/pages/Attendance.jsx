import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { attendanceService, registrationService, batchService, getErrorMessage } from "../../services";
import { useCollection } from "../useCollection";
import { REG_STANDARDS } from "../data";
import { downloadCSV, fmtDate } from "../utils";
import {
  STATUSES, STATUS_SHORT, STATUS_CLASS, NO_COLUMN, parseDelimited, guessMapping, looksLikeHeader, buildPunches, makeMatcher,
  localToday, monthKey, monthRange, monthLabel, daysInMonth, isSunday, summarize, buildMonthReport, buildDayReport, sampleCsv,
} from "../attendanceTools";
import { LoadingState, ErrorState } from "../../components/StatusViews";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import "./attendance.css";

/* Loads the attendance records of a date range; `version` changes -> load again (after saving / importing). */
function useRecords(from, to, version) {
  const [st, setSt] = useState({ rows: null, err: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let off = false;
    setSt({ rows: null, err: "" });
    attendanceService.list(from, to).then((rows) => { if (!off) setSt({ rows, err: "" }); }).catch((e) => { if (!off) setSt({ rows: null, err: getErrorMessage(e) }); });
    return () => { off = true; };
  }, [from, to, version, retry]);
  return { ...st, reload: () => setRetry((n) => n + 1) };
}

/* standard + batch + search filters shared by "Mark" and "Report" */
function useStudentFilter(students, batches) {
  const [std, setStd] = useState("All");
  const [batchId, setBatchId] = useState("All");
  const [q, setQ] = useState("");
  const batchList = useMemo(() => (batches || []).filter((b) => std === "All" || b.standard === std), [batches, std]);
  const list = useMemo(() => {
    const b = batchId === "All" ? null : (batches || []).find((x) => String(x.id) === String(batchId));
    const ids = b ? new Set(b.studentIds || []) : null;
    return students
      .filter((s) => std === "All" || s.standard === std)
      .filter((s) => !ids || ids.has(s.id))
      .filter((s) => `${s.name} ${s.mobile} ${s.biometricId || ""}`.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => a.standard.localeCompare(b.standard, undefined, { numeric: true }) || a.name.localeCompare(b.name));
  }, [students, batches, std, batchId, q]);
  const controls = (
    <>
      <input className="db-input grow" type="search" placeholder="Search name, mobile, biometric ID…" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      <select className="db-input" aria-label="Standard" value={std} onChange={(e) => { setStd(e.target.value); setBatchId("All"); }}><option value="All">All standards</option>{REG_STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
      <select className="db-input" aria-label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}><option value="All">All batches</option>{batchList.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.standard})</option>)}</select>
    </>
  );
  return { list, controls };
}

/* ======================================================================= MARK (manual) */
function MarkTab({ students, batches, version, onSaved }) {
  const [date, setDate] = useState(localToday());
  const rec = useRecords(date, date, version);
  const { list, controls } = useStudentFilter(students, batches);
  const [draft, setDraft] = useState({}); // studentId -> { status, note }
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });

  const saved = useMemo(() => new Map((rec.rows || []).map((r) => [r.studentId, r])), [rec.rows]);
  useEffect(() => {
    if (!rec.rows) return;
    setDraft(Object.fromEntries(rec.rows.map((r) => [r.studentId, { status: r.status, note: r.note || "" }])));
    setDirty(false);
  }, [rec.rows]);

  const change = (id, patch) => { setDraft((d) => ({ ...d, [id]: { status: "", note: "", ...d[id], ...patch } })); setDirty(true); setMsg({ ok: "", err: "" }); };
  const changeDate = (v) => {
    if (!v) return;
    if (dirty && !window.confirm("You have unsaved changes for this date. Discard them?")) return;
    setDate(v); setMsg({ ok: "", err: "" });
  };
  const markAll = (status) => { setDraft((d) => { const n = { ...d }; list.forEach((s) => { n[s.id] = { note: "", ...n[s.id], status }; }); return n; }); setDirty(true); };

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Late: 0, Leave: 0, none: 0 };
    list.forEach((s) => { const st = (draft[s.id] || {}).status; if (st) c[st]++; else c.none++; });
    return c;
  }, [list, draft]);

  const save = async () => {
    const records = students.filter((s) => draft[s.id] && draft[s.id].status).map((s) => ({ studentId: s.id, status: draft[s.id].status, note: (draft[s.id].note || "").trim() }))
      .filter((r) => { const o = saved.get(r.studentId); return !o || o.status !== r.status || (o.note || "") !== r.note; }); // only what changed
    if (!records.length) { setMsg({ ok: "", err: "Nothing to save. Mark at least one student." }); return; }
    setBusy(true);
    try {
      const res = await attendanceService.mark(date, records);
      setMsg({ ok: `Saved attendance of ${res.saved} student${res.saved === 1 ? "" : "s"} for ${fmtDate(date)}.`, err: "" });
      setDirty(false);
      onSaved();
    } catch (e) { setMsg({ ok: "", err: getErrorMessage(e) }); }
    setBusy(false);
  };

  return (
    <section className="kw-panel att-panel">
      <div className="db-toolbar">
        <label className="att-date">Date<input className="db-input" type="date" value={date} max={localToday()} onChange={(e) => changeDate(e.target.value)} /></label>
        {controls}
      </div>
      {rec.err ? <ErrorState message={rec.err} onRetry={rec.reload} /> : !rec.rows ? <LoadingState label="Loading attendance…" /> : (
        <>
          <div className="att-counts" aria-live="polite">
            {STATUSES.map((s) => <span key={s} className={`att-chip ${STATUS_CLASS[s]}`}>{s}: <b>{counts[s]}</b></span>)}
            <span className="att-chip">Not marked: <b>{counts.none}</b></span>
            <span className="att-quick db-no-print">
              <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => markAll("Present")} disabled={!list.length}>Mark all Present</button>
              <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => markAll("Absent")} disabled={!list.length}>Mark all Absent</button>
            </span>
          </div>
          {!list.length ? <p className="db-muted att-empty">No students match. Add students under Registrations first{students.length ? ", or change the filters" : ""}.</p> : (
            <div className="att-list">
              {list.map((s) => {
                const d = draft[s.id] || {};
                const r = saved.get(s.id);
                return (
                  <div key={s.id} className={`att-row${d.status ? ` is-${STATUS_CLASS[d.status]}` : ""}`}>
                    <div className="att-who">
                      <b>{s.name}</b>
                      <small className="db-muted">{s.standard}{s.target ? ` · ${s.target}` : ""}{s.biometricId ? ` · ID ${s.biometricId}` : ""}</small>
                      {r && (r.inTime || r.outTime) && <small className="att-times">{r.inTime && `In ${r.inTime}`}{r.outTime && ` · Out ${r.outTime}`} · {r.source}</small>}
                    </div>
                    <div className="att-seg" role="group" aria-label={`Attendance of ${s.name}`}>
                      {STATUSES.map((st) => (
                        <button key={st} type="button" className={`${STATUS_CLASS[st]}${d.status === st ? " on" : ""}`} aria-pressed={d.status === st} onClick={() => change(s.id, { status: st })}>{st}</button>
                      ))}
                    </div>
                    <input className="db-input att-note" placeholder="Note (optional)" aria-label={`Note for ${s.name}`} maxLength={200} value={d.note || ""} onChange={(e) => change(s.id, { note: e.target.value })} disabled={!d.status} />
                  </div>
                );
              })}
            </div>
          )}
          {msg.err && <p className="db-err" role="alert">{msg.err}</p>}
          {msg.ok && <p className="att-ok" role="status">{msg.ok}</p>}
          <div className="att-savebar stick db-no-print">
            <span className="db-muted">{dirty ? "Unsaved changes" : "All changes saved"}</span>
            <button type="button" className="kw-btn" onClick={save} disabled={busy || !dirty}>{busy ? "Saving…" : "Save attendance"}</button>
          </div>
        </>
      )}
    </section>
  );
}

/* ======================================================================= IMPORT (biometric device file) */
const COLS = [["id", "Student / device ID", true], ["dt", "Date & time (one column)", false], ["date", "Date column", false], ["time", "Time column (In)", false], ["out", "Out-time column", false]];

function ImportTab({ students, onImported }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [map, setMap] = useState({ id: NO_COLUMN, dt: NO_COLUMN, date: NO_COLUMN, time: NO_COLUMN, out: NO_COLUMN });
  const [dayFirst, setDayFirst] = useState(true);
  const [lateAfter, setLateAfter] = useState("");
  const [markAbsent, setMarkAbsent] = useState(true);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const load = (table, name) => {
    setResult(null);
    if (!table.length) { setErr("The file is empty."); setRows([]); return; }
    const h = looksLikeHeader(table);
    setErr(""); setFileName(name); setRows(table); setHasHeader(h); setMap(guessMapping(table, h));
  };
  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setErr(""); setResult(null);
    try {
      if (f.size > 15 * 1024 * 1024) throw new Error("This file is too big (limit 15 MB). Export a shorter date range from the machine.");
      if (/\.xls$/i.test(f.name)) throw new Error("Old .xls files cannot be read here. Open it in Excel and use Save As → .xlsx or CSV, then upload again.");
      if (/\.xlsx$/i.test(f.name)) { const { readXlsx } = await import("../xlsxReader"); load(await readXlsx(await f.arrayBuffer()), f.name); }
      else load(parseDelimited(await f.text()), f.name);
    } catch (ex) { setErr(ex.message || "Could not read this file."); setRows([]); }
    e.target.value = "";
  };
  const usePasted = () => load(parseDelimited(paste), "pasted data");
  const reset = () => { setRows([]); setFileName(""); setPaste(""); setResult(null); setErr(""); };
  const setCol = (k) => (e) => setMap((m) => ({ ...m, [k]: Number(e.target.value) }));

  const matcher = useMemo(() => makeMatcher(students), [students]);
  const built = useMemo(() => (rows.length ? buildPunches(rows, hasHeader, map, dayFirst) : { punches: [], bad: [] }), [rows, hasHeader, map, dayFirst]);
  const info = useMemo(() => {
    const byId = new Map();
    const dates = new Set();
    built.punches.forEach((p) => { byId.set(p.biometricId, (byId.get(p.biometricId) || 0) + 1); dates.add(p.date); });
    const matched = [], unknown = [];
    byId.forEach((n, id) => { const s = matcher(id); if (s) matched.push({ id, s, n }); else unknown.push(id); });
    const ds = [...dates].sort();
    const today = localToday();
    return { matched, unknown, from: ds[0], to: ds[ds.length - 1], days: ds.length, future: ds.some((d) => d > today), long: ds.length > 1 && (new Date(ds[ds.length - 1]) - new Date(ds[0])) / 86400000 > 92 };
  }, [built, matcher]);

  const wideMap = map.dt === NO_COLUMN && map.date === NO_COLUMN;
  const ready = rows.length > 0 && map.id !== NO_COLUMN && !wideMap && built.punches.length > 0 && info.matched.length > 0;

  const run = async () => {
    // keep only the first and last punch of each student per day: that is all the server needs
    const g = new Map();
    built.punches.forEach((p) => {
      if (!matcher(p.biometricId) || p.date > localToday()) return;
      const k = `${p.biometricId}|${p.date}`;
      const cur = g.get(k) || { id: p.biometricId, date: p.date, times: [] };
      if (p.time) cur.times.push(p.time);
      g.set(k, cur);
    });
    const punches = [];
    g.forEach((v) => {
      v.times.sort();
      if (!v.times.length) punches.push({ biometricId: v.id, timestamp: v.date });
      else { punches.push({ biometricId: v.id, timestamp: `${v.date} ${v.times[0]}` }); if (v.times.length > 1) punches.push({ biometricId: v.id, timestamp: `${v.date} ${v.times[v.times.length - 1]}` }); }
    });
    setBusy(true); setErr("");
    try { const res = await attendanceService.importPunches({ punches, lateAfter, markAbsent }); setResult({ ...res, unknownIds: [...new Set([...(res.unknownIds || []), ...info.unknown])] }); onImported(); }
    catch (e) { setErr(getErrorMessage(e)); }
    setBusy(false);
  };

  const download = () => downloadCSV("sample-biometric-log.csv", sampleCsv(students).split("\n").map((l) => l.split(",")));
  const head = hasHeader ? rows[0] : rows[0] && rows[0].map((_, i) => `Column ${i + 1}`);
  const roleOf = (i) => (Object.entries(map).find(([, v]) => v === i) || [])[0];
  const roleLabel = { id: "ID", dt: "Date & time", date: "Date", time: "Time", out: "Out time" };

  return (
    <section className="kw-panel att-panel">
      {result ? (
        <div className="att-result" role="status">
          <h3>✅ Import finished</h3>
          <ul>
            <li><b>{result.studentsMatched}</b> students · <b>{result.days}</b> day{result.days === 1 ? "" : "s"}</li>
            <li><b>{result.created}</b> new records, <b>{result.updated}</b> updated</li>
            {result.absentMarked > 0 && <li><b>{result.absentMarked}</b> students had no punch and were marked Absent</li>}
            {result.skippedRows > 0 && <li><b>{result.skippedRows}</b> punches skipped (ID not found or future date)</li>}
          </ul>
          {result.unknownIds && result.unknownIds.length > 0 && <p className="att-warn">IDs not found: {result.unknownIds.join(", ")}. Open Registrations → Edit and type the same ID in “Biometric ID”, then import again.</p>}
          <div className="db-actions"><button type="button" className="kw-btn" onClick={reset}>Import another file</button></div>
        </div>
      ) : (
        <>
          <details className="att-help" open={!rows.length}>
            <summary>How does biometric import work?</summary>
            <ol>
              <li>On the attendance machine (or its PC software such as ZKTime, eSSL eTimeTrack, Realtime) export the <b>attendance log</b> for the dates you want — as CSV, TXT, DAT or Excel (.xlsx).</li>
              <li>Each student needs a <b>Biometric ID</b> = the User ID enrolled on the machine (Registrations → Edit). If it is empty we try the mobile number, then the registration number.</li>
              <li>Upload the file here. Check the preview, then press <b>Import</b>. The first punch of the day becomes the In time and the last punch the Out time.</li>
            </ol>
            <p className="db-muted">A web page cannot talk to the machine directly. Automatic sync (the machine pushing logs to the server) needs the Django backend — see docs/API_CONTRACT.md. Until then, this file import takes a minute a day.</p>
          </details>

          {!rows.length ? (
            <div className="att-drop">
              <input ref={fileRef} type="file" accept=".csv,.txt,.dat,.log,.xlsx,text/csv,text/plain" onChange={onFile} hidden />
              <button type="button" className="kw-btn" onClick={() => fileRef.current && fileRef.current.click()}>Choose biometric file</button>
              <span className="db-muted">CSV · TXT · DAT · XLSX</span>
              <button type="button" className="db-link-btn" onClick={download}>Download a sample file</button>
              <label className="db-field att-paste">…or paste the log text here
                <textarea className="db-input" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"101,2026-10-26 08:52:10\n102,2026-10-26 09:05:44"} />
              </label>
              <button type="button" className="kw-btn db-btn-line" onClick={usePasted} disabled={!paste.trim()}>Use pasted text</button>
              {err && <p className="db-err" role="alert">{err}</p>}
            </div>
          ) : (
            <>
              <div className="att-filebar"><b>{fileName}</b><span className="db-muted">{rows.length - (hasHeader ? 1 : 0)} rows</span><button type="button" className="db-link-btn" onClick={reset}>Choose another file</button></div>

              <h3 className="att-h">1. Tell us which column is which</h3>
              <label className="db-check"><input type="checkbox" checked={hasHeader} onChange={(e) => { setHasHeader(e.target.checked); setMap(guessMapping(rows, e.target.checked)); }} /> First row contains column titles</label>
              <div className="att-cols">
                {COLS.map(([k, label, req]) => (
                  <label key={k} className="db-field">{label}{req ? " *" : ""}
                    <select className="db-input" value={map[k]} onChange={setCol(k)}>
                      <option value={NO_COLUMN}>{req ? "— choose —" : "— not used —"}</option>
                      {head.map((h, i) => <option key={i} value={i}>{String(h) || `Column ${i + 1}`}</option>)}
                    </select>
                  </label>
                ))}
                <label className="db-field">Dates are written as
                  <select className="db-input" value={dayFirst ? "dmy" : "mdy"} onChange={(e) => setDayFirst(e.target.value === "dmy")}>
                    <option value="dmy">DD/MM/YYYY (26/10/2026)</option><option value="mdy">MM/DD/YYYY (10/26/2026)</option>
                  </select>
                </label>
              </div>
              {wideMap && <p className="att-warn">Choose the “Date &amp; time” column, or a “Date” column (and a “Time” column).</p>}

              <div className="db-scroll att-prev">
                <table className="db-rtable">
                  <thead><tr>{head.map((h, i) => <th key={i} className={roleOf(i) ? "att-th-on" : ""}>{String(h) || `Column ${i + 1}`}{roleOf(i) && <small> ← {roleLabel[roleOf(i)]}</small>}</th>)}</tr></thead>
                  <tbody>{rows.slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + 5).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
                </table>
              </div>

              <h3 className="att-h">2. Check what we understood</h3>
              {built.punches.length === 0 ? <p className="att-warn">No valid rows found with these columns. Change the column choice above{wideMap ? "" : " or the date format"}.</p> : (
                <>
                  <div className="db-stats att-stats">
                    <StatCard icon="🕘" label="Punches read" value={built.punches.length} note={built.bad.length ? `${built.bad.length} rows skipped` : "all rows OK"} />
                    <StatCard icon="🎓" label="Students found" value={info.matched.length} tone="green" note={info.unknown.length ? `${info.unknown.length} IDs not found` : "all IDs matched"} />
                    <StatCard icon="📅" label="Days" value={info.days} tone="orange" note={info.from ? `${fmtDate(info.from)} – ${fmtDate(info.to)}` : ""} />
                  </div>
                  {info.unknown.length > 0 && <p className="att-warn">IDs not matching any active student: <b>{info.unknown.slice(0, 15).join(", ")}{info.unknown.length > 15 ? "…" : ""}</b>. Set their “Biometric ID” in Registrations. These rows will be skipped.</p>}
                  {info.future && <p className="att-warn">Some dates are in the future — future punches are skipped. Check the date format above.</p>}
                  {info.long && <p className="att-warn">This file covers more than 3 months. If that is not expected, check that the date format above is right.</p>}
                  <div className="db-scroll att-prev">
                    <table className="db-rtable">
                      <thead><tr><th>Device ID</th><th>Student</th><th>Date</th><th>Time</th></tr></thead>
                      <tbody>{built.punches.slice(0, 6).map((p, i) => { const s = matcher(p.biometricId); return <tr key={i}><td>{p.biometricId}</td><td>{s ? s.name : <span className="att-bad">not found</span>}</td><td>{fmtDate(p.date)}</td><td>{p.time || "—"}</td></tr>; })}</tbody>
                    </table>
                  </div>
                </>
              )}

              <h3 className="att-h">3. Options</h3>
              <div className="db-row2">
                <label className="db-field">Mark “Late” if first punch is after
                  <input className="db-input" type="time" value={lateAfter} onChange={(e) => setLateAfter(e.target.value)} />
                  <small className="db-muted">Leave empty if you do not track late arrivals.</small>
                </label>
                <label className="db-check att-opt"><input type="checkbox" checked={markAbsent} onChange={(e) => setMarkAbsent(e.target.checked)} />
                  <span>Mark active students with no punch as <b>Absent</b> on the days in this file<br /><small className="db-muted">Only days when at least one student punched. Existing records are never overwritten.</small></span>
                </label>
              </div>
              {err && <p className="db-err" role="alert">{err}</p>}
              <div className="att-savebar">
                <span className="db-muted">{ready ? `Ready: ${info.matched.length} students, ${info.days} day(s).` : "Choose the columns to continue."}</span>
                <button type="button" className="kw-btn" onClick={run} disabled={!ready || busy}>{busy ? "Importing…" : "Import attendance"}</button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

/* ======================================================================= REPORT */
const pctTone = (p) => (p == null ? "" : p >= 85 ? "good" : p >= 75 ? "mid" : "low");

function ReportTab({ students, batches, version }) {
  const [month, setMonth] = useState(monthKey(localToday()));
  const [view, setView] = useState("student");
  const [limit, setLimit] = useState(75);
  const range = monthRange(month);
  const rec = useRecords(range.from, range.to, version);
  const { list, controls } = useStudentFilter(students, batches);

  const { studentRows, dayRows, overall, working, low } = useMemo(() => {
    const records = rec.rows || [];
    const has = new Set(records.map((r) => r.studentId));
    const pool = list.filter((s) => s.status !== "Inactive" || has.has(s.id));
    const sr = buildMonthReport(pool, records, month);
    const ids = new Set(pool.map((s) => s.id));
    const scoped = records.filter((r) => ids.has(r.studentId));
    return { studentRows: sr, dayRows: buildDayReport(pool, records, month), overall: summarize(scoped), working: new Set(scoped.map((r) => r.date)).size, low: sr.filter((r) => r.sum.percent != null && r.sum.percent < limit).length };
  }, [rec.rows, list, month]);

  const dim = daysInMonth(month);
  const days = Array.from({ length: dim }, (_, i) => i + 1);

  const exportCsv = () => {
    if (view === "student") downloadCSV(`attendance-${month}.csv`, [["Student", "Standard", ...days, "Present", "Late", "Absent", "Leave", "Attendance %"], ...studentRows.map((r) => [r.student.name, r.student.standard, ...days.map((d) => (r.byDay[d] ? STATUS_SHORT[r.byDay[d]] : "")), r.sum.Present, r.sum.Late, r.sum.Absent, r.sum.Leave, r.sum.percent == null ? "" : r.sum.percent])]);
    else downloadCSV(`attendance-daywise-${month}.csv`, [["Date", "Present", "Late", "Absent", "Leave", "Marked", "Attendance %"], ...dayRows.map((r) => [r.date, r.Present, r.Late, r.Absent, r.Leave, r.total, r.percent == null ? "" : r.percent])]);
  };

  return (
    <section className="att-panel">
      <div className="kw-panel att-panel">
        <div className="db-toolbar">
          <label className="att-date">Month<input className="db-input" type="month" value={month} max={monthKey(localToday())} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>
          {controls}
          <label className="att-date">Low below %<input className="db-input att-limit" type="number" min={1} max={100} value={limit} onChange={(e) => setLimit(Math.max(1, Math.min(100, Number(e.target.value) || 75)))} /></label>
        </div>
        <div className="att-views db-no-print">
          <div className="db-seg att-seg2">
            <button type="button" className={view === "student" ? "on" : ""} onClick={() => setView("student")}>Student-wise</button>
            <button type="button" className={view === "day" ? "on" : ""} onClick={() => setView("day")}>Day-wise</button>
          </div>
          <span className="att-quick">
            <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={exportCsv} disabled={!rec.rows || !(view === "student" ? studentRows.length : dayRows.length)}>Export CSV</button>
            <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => window.print()}>Print</button>
          </span>
        </div>
      </div>

      {rec.err ? <ErrorState message={rec.err} onRetry={rec.reload} /> : !rec.rows ? <LoadingState label="Preparing report…" /> : (
        <>
          <div className="db-stats">
            <StatCard icon="🎓" label="Students" value={studentRows.length} note={monthLabel(month)} />
            <StatCard icon="✅" label="Attendance" value={overall.percent == null ? "—" : `${overall.percent}%`} tone="green" note={`${overall.Present + overall.Late} present of ${overall.total} marked`} />
            <StatCard icon="📅" label="Working days" value={working} tone="orange" note="days with attendance" />
            <StatCard icon="⚠️" label={`Below ${limit}%`} value={low} tone="purple" note="students need attention" />
          </div>

          <div className="kw-panel att-panel">
            <h2 className="att-title">{view === "student" ? "Student-wise attendance" : "Day-wise attendance"} — {monthLabel(month)}</h2>
            {view === "student" ? (
              !studentRows.length ? <p className="db-muted att-empty">No students to show for these filters.</p> : (
                <div className="db-scroll">
                  <table className="att-matrix">
                    <thead><tr><th className="att-sticky">Student</th><th className="tot">%</th><th className="tot">P</th><th className="tot">L</th><th className="tot">A</th><th className="tot">Lv</th>{days.map((d) => <th key={d} className={isSunday(month, d) ? "sun" : ""}>{d}</th>)}</tr></thead>
                    <tbody>
                      {studentRows.map((r) => (
                        <tr key={r.student.id} className={r.sum.percent != null && r.sum.percent < limit ? "low-row" : ""}>
                          <td className="att-sticky"><b>{r.student.name}</b><small>{r.student.standard}</small></td>
                          <td className={`tot att-pct ${pctTone(r.sum.percent)}`}>{r.sum.percent == null ? "—" : `${r.sum.percent}%`}</td>
                          <td className="tot">{r.sum.Present}</td><td className="tot">{r.sum.Late}</td><td className="tot">{r.sum.Absent}</td><td className="tot">{r.sum.Leave}</td>
                          {days.map((d) => { const st = r.byDay[d]; return <td key={d} className={`${isSunday(month, d) ? "sun " : ""}${st ? `c-${STATUS_CLASS[st]}` : ""}`} title={st ? `${d} ${monthLabel(month)}: ${st}` : ""}>{st ? STATUS_SHORT[st] : ""}</td>; })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              !dayRows.length ? <p className="db-muted att-empty">No attendance has been marked in this month yet.</p> : (
                <div className="db-scroll">
                  <table className="db-rtable">
                    <thead><tr><th>Date</th><th>Present</th><th>Late</th><th>Absent</th><th>Leave</th><th>Marked</th><th>Attendance</th></tr></thead>
                    <tbody>{dayRows.map((r) => <tr key={r.date}><td>{fmtDate(r.date)}</td><td>{r.Present}</td><td>{r.Late}</td><td>{r.Absent}</td><td>{r.Leave}</td><td>{r.total} / {r.roster}</td><td className={`att-pct ${pctTone(r.percent)}`}>{r.percent == null ? "—" : `${r.percent}%`}</td></tr>)}</tbody>
                  </table>
                </div>
              )
            )}
            <p className="att-legend"><span className="att-chip p">P Present</span><span className="att-chip l">L Late</span><span className="att-chip a">A Absent</span><span className="att-chip v">Lv Leave</span> Attendance % = (Present + Late) ÷ all marked days. Blank = not marked. Shaded columns = Sundays.</p>
          </div>
        </>
      )}
    </section>
  );
}

/* ======================================================================= PAGE */
const TABS = [["mark", "✍️ Mark attendance"], ["import", "📥 Import biometric file"], ["report", "📊 Attendance report"]];

export default function Attendance() {
  const sc = useCollection(registrationService);
  const bc = useCollection(batchService);
  const [tab, setTab] = useState("mark");
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const students = sc.rows || [];

  return (
    <>
      <PageHeader title="Attendance" sub="Mark attendance by hand, import the log of your biometric machine, and see monthly reports." />
      {sc.loadErr ? <ErrorState message={sc.loadErr} onRetry={sc.load} /> : !sc.rows ? <LoadingState label="Loading students…" /> : (
        <>
          <div className="db-seg att-tabs db-no-print" role="tablist">
            {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}
          </div>
          {tab === "mark" && <MarkTab students={students.filter((s) => s.status !== "Inactive")} batches={bc.rows || []} version={version} onSaved={bump} />}
          {tab === "import" && <ImportTab students={students.filter((s) => s.status !== "Inactive")} onImported={bump} />}
          {tab === "report" && <ReportTab students={students} batches={bc.rows || []} version={version} />}
        </>
      )}
    </>
  );
}
