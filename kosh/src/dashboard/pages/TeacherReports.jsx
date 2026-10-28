import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { attendanceService, batchService, examResultService, registrationService, testService } from "../../services";
import { useCollection, Gate } from "../useCollection";
import { localToday, summarize } from "../attendanceTools";
import { downloadCSV } from "../utils";
import PageHeader from "../components/PageHeader";
import "./teacher.css";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const pctOf = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const show = (v) => (v == null ? "—" : `${v}%`);

/* One page with every report a teacher needs. Everything is computed from the same data as the other pages and can be exported to CSV. */
export default function TeacherReports() {
  const rc = useCollection(registrationService);
  const bc = useCollection(batchService);
  const tc = useCollection(testService);
  const ec = useCollection(examResultService);
  const [days, setDays] = useState(30);
  const [att, setAtt] = useState(null);
  useEffect(() => { setAtt(null); attendanceService.list(daysAgo(days), localToday()).then(setAtt).catch(() => setAtt([])); }, [days]);

  const regs = useMemo(() => (rc.rows || []).filter((r) => r.status !== "Inactive"), [rc.rows]);
  const attempts = ec.rows || [];

  /* attendance % and average test % for a list of student ids */
  const statsFor = (ids) => {
    const set = new Set(ids);
    const a = summarize((att || []).filter((r) => set.has(r.studentId)));
    const mine = attempts.filter((x) => set.has(Number(String(x.studentKey).replace(/^\D+/, ""))) && String(x.studentKey).startsWith("r") && x.total);
    const avg = mine.length ? Math.round(mine.reduce((s, x) => s + (x.score / x.total) * 100, 0) / mine.length * 10) / 10 : null;
    return { att: a, attPct: a.percent, tests: mine.length, avg };
  };

  const batchRows = useMemo(() => (bc.rows || []).map((b) => ({ b, ...statsFor(b.studentIds || []) })), [bc.rows, att, attempts]); // eslint-disable-line react-hooks/exhaustive-deps
  const studentRows = useMemo(() => regs.map((s) => {
    const mine = (bc.rows || []).filter((b) => (b.studentIds || []).includes(s.id)).map((b) => b.name).join(", ");
    return { s, batches: mine, ...statsFor([s.id]) };
  }), [regs, bc.rows, att, attempts]); // eslint-disable-line react-hooks/exhaustive-deps
  const testRows = useMemo(() => (tc.rows || []).map((t) => {
    const mine = attempts.filter((a) => a.examId === t.id && a.total);
    const avg = mine.length ? Math.round(mine.reduce((s, a) => s + (a.score / a.total) * 100, 0) / mine.length * 10) / 10 : null;
    const top = mine.reduce((m, a) => Math.max(m, Math.round((a.score / a.total) * 1000) / 10), 0);
    return { t, n: mine.length, avg, top: mine.length ? top : null };
  }), [tc.rows, attempts]);
  const dayRows = useMemo(() => {
    const m = new Map();
    (att || []).forEach((r) => { if (!m.has(r.date)) m.set(r.date, []); m.get(r.date).push(r); });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, l]) => ({ date, ...summarize(l) }));
  }, [att]);
  const low = studentRows.filter((r) => r.attPct != null && r.attPct < 75);

  return (
    <>
      <PageHeader title="Reports" sub="Batch, student, test and attendance reports — export any of them to CSV.">
        <select className="db-input" aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
        <Link to="/dashboard/attendance" className="kw-btn db-btn-line">Monthly attendance sheet</Link>
        <Link to="/dashboard/analysis" className="kw-btn db-btn-line">Analysis</Link>
      </PageHeader>
      <Gate cs={[rc, bc, tc, ec]} label="Preparing reports…">
        <section className="kw-panel db-rep">
          <div className="db-rep-head"><h2>Batch report</h2>
            <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => downloadCSV("batch-report.csv", [["Batch", "Standard", "Students", `Attendance % (${days}d)`, "Tests written", "Avg test %"], ...batchRows.map((r) => [r.b.name, r.b.standard, (r.b.studentIds || []).length, r.attPct ?? "", r.tests, r.avg ?? ""])])}>Export CSV</button></div>
          <div className="db-scroll"><table className="db-rtable"><thead><tr><th>Batch</th><th>Std</th><th>Students</th><th>Attendance</th><th>Tests written</th><th>Avg test score</th></tr></thead>
            <tbody>{batchRows.map((r) => <tr key={r.b.id}><td><b>{r.b.name}</b></td><td>{r.b.standard}</td><td>{(r.b.studentIds || []).length}</td><td>{show(r.attPct)}</td><td>{r.tests}</td><td>{show(r.avg)}</td></tr>)}
              {!batchRows.length && <tr><td colSpan={6} className="db-muted">No batches yet.</td></tr>}</tbody></table></div>
        </section>

        <section className="kw-panel db-rep">
          <div className="db-rep-head"><h2>Test report</h2>
            <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => downloadCSV("test-report.csv", [["Test", "Standard", "Date", "Status", "Assigned to", "Students attempted", "Avg %", "Highest %"], ...testRows.map((r) => [r.t.name, r.t.standard, r.t.date, r.t.status, (r.t.batchNames || []).join("; ") || "All", r.n, r.avg ?? "", r.top ?? ""])])}>Export CSV</button></div>
          <div className="db-scroll"><table className="db-rtable"><thead><tr><th>Test</th><th>Std</th><th>Date</th><th>Status</th><th>Attempted</th><th>Avg</th><th>Highest</th><th></th></tr></thead>
            <tbody>{testRows.map((r) => <tr key={r.t.id}><td><b>{r.t.name}</b></td><td>{r.t.standard || "—"}</td><td>{r.t.date}</td><td>{r.t.status}</td><td>{r.n}</td><td>{show(r.avg)}</td><td>{show(r.top)}</td><td><Link to={`/dashboard/tests`}>Results</Link></td></tr>)}
              {!testRows.length && <tr><td colSpan={8} className="db-muted">No tests yet.</td></tr>}</tbody></table></div>
        </section>

        <section className="kw-panel db-rep">
          <div className="db-rep-head"><h2>Student report</h2>
            <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => downloadCSV("student-report.csv", [["Student", "Standard", "Batches", "Mobile", `Attendance % (${days}d)`, "Present", "Absent", "Late", "Leave", "Tests written", "Avg test %"], ...studentRows.map((r) => [r.s.name, r.s.standard, r.batches, r.s.mobile, r.attPct ?? "", r.att.Present, r.att.Absent, r.att.Late, r.att.Leave, r.tests, r.avg ?? ""])])}>Export CSV</button></div>
          <div className="db-scroll"><table className="db-rtable"><thead><tr><th>Student</th><th>Std</th><th>Batches</th><th>Attendance</th><th>Tests</th><th>Avg score</th></tr></thead>
            <tbody>{studentRows.map((r) => <tr key={r.s.id}><td><b>{r.s.name}</b></td><td>{r.s.standard}</td><td>{r.batches || "—"}</td><td>{show(r.attPct)}</td><td>{r.tests}</td><td>{show(r.avg)}</td></tr>)}
              {!studentRows.length && <tr><td colSpan={6} className="db-muted">No students yet.</td></tr>}</tbody></table></div>
        </section>

        <section className="kw-panel db-rep">
          <div className="db-rep-head"><h2>Attendance — day-wise</h2>
            <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => downloadCSV("attendance-daywise.csv", [["Date", "Present", "Absent", "Late", "Leave", "Attendance %"], ...dayRows.map((r) => [r.date, r.Present, r.Absent, r.Late, r.Leave, r.percent ?? ""])])}>Export CSV</button></div>
          {att == null ? <p className="db-muted">Loading…</p> : (
            <div className="db-scroll"><table className="db-rtable"><thead><tr><th>Date</th><th>Present</th><th>Absent</th><th>Late</th><th>Leave</th><th>%</th></tr></thead>
              <tbody>{dayRows.map((r) => <tr key={r.date}><td>{r.date}</td><td>{r.Present}</td><td>{r.Absent}</td><td>{r.Late}</td><td>{r.Leave}</td><td>{show(r.percent)}</td></tr>)}
                {!dayRows.length && <tr><td colSpan={6} className="db-muted">No attendance marked in this period.</td></tr>}</tbody></table></div>
          )}
        </section>

        <section className="kw-panel db-rep">
          <div className="db-rep-head"><h2>Low attendance (below 75%)</h2>
            <button type="button" className="kw-btn db-btn-sm db-btn-line" disabled={!low.length} onClick={() => downloadCSV("low-attendance.csv", [["Student", "Standard", "Mobile", "Parent mobile", "Attendance %"], ...low.map((r) => [r.s.name, r.s.standard, r.s.mobile, r.s.parentMobile || "", r.attPct])])}>Export CSV</button></div>
          <div className="db-scroll"><table className="db-rtable"><thead><tr><th>Student</th><th>Std</th><th>Mobile</th><th>Attendance</th></tr></thead>
            <tbody>{low.map((r) => <tr key={r.s.id}><td><b>{r.s.name}</b></td><td>{r.s.standard}</td><td>{r.s.mobile}</td><td style={{ color: "#b91c1c" }}><b>{show(r.attPct)}</b></td></tr>)}
              {!low.length && <tr><td colSpan={4} className="db-muted">Nobody is below 75% in this period.</td></tr>}</tbody></table></div>
        </section>
      </Gate>
    </>
  );
}
