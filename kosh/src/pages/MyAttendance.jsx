import { useEffect, useMemo, useState } from "react";
import { attendanceService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";
import { STATUS_CLASS, STATUS_SHORT, localToday, monthKey, monthLabel, daysInMonth, summarize } from "../dashboard/attendanceTools";
import "../dashboard/pages/attendance.css";

const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

/* Attendance of the logged-in student (who = "student") or of the parent's child (who = "parent"): month calendar + totals. */
export default function MyAttendance({ who = "student" }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [month, setMonth] = useState(monthKey(localToday()));
  const load = () => { setErr(""); (who === "parent" ? attendanceService.forParent() : attendanceService.forStudent()).then(setRows).catch((e) => setErr(getErrorMessage(e))); };
  useEffect(load, [who]);

  const mine = useMemo(() => (rows || []).filter((r) => monthKey(r.date) === month).sort((a, b) => a.date.localeCompare(b.date)), [rows, month]);
  const byDay = useMemo(() => new Map(mine.map((r) => [Number(r.date.slice(8, 10)), r])), [mine]);
  const sum = summarize(mine), all = summarize(rows || []);

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!rows) return <LoadingState label="Loading attendance…" />;

  const [y, m] = month.split("-").map(Number);
  const lead = new Date(y, m - 1, 1).getDay(); // Sunday-first calendar
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth(month) }, (_, i) => i + 1)];
  const box = { border: "1px solid #e4e9f2", borderRadius: 12, padding: "10px 14px", minWidth: 110, background: "#fff" };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <label className="att-date">Month<input className="db-input" type="month" value={month} max={monthKey(localToday())} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>
        <div style={box}><small className="db-muted">This month</small><br /><b style={{ fontSize: 22 }}>{sum.percent == null ? "—" : `${sum.percent}%`}</b></div>
        <div style={box}><small className="db-muted">Overall</small><br /><b style={{ fontSize: 22 }}>{all.percent == null ? "—" : `${all.percent}%`}</b></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="att-chip p">Present <b>{sum.Present}</b></span><span className="att-chip l">Late <b>{sum.Late}</b></span>
          <span className="att-chip a">Absent <b>{sum.Absent}</b></span><span className="att-chip v">Leave <b>{sum.Leave}</b></span>
        </div>
      </div>
      <h4 style={{ margin: "0 0 4px" }}>{monthLabel(month)}</h4>
      <div className="att-me-grid" aria-label="Attendance calendar">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="hd">{d}</span>)}
        {cells.map((d, i) => {
          const r = d && byDay.get(d);
          return <span key={i} className={r ? `c-${STATUS_CLASS[r.status]}` : ""} style={d ? undefined : { background: "none" }} title={r ? `${fmt(r.date)}: ${r.status}${r.inTime ? ` (in ${r.inTime})` : ""}` : ""}>{d ? (r ? STATUS_SHORT[r.status] : d) : ""}</span>;
        })}
      </div>
      {mine.filter((r) => r.status !== "Present").length > 0 && (
        <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 14 }}>
          {mine.filter((r) => r.status !== "Present").map((r) => <li key={r.id}><span className={`att-chip ${STATUS_CLASS[r.status]}`}>{r.status}</span> {fmt(r.date)}{r.inTime ? ` · in ${r.inTime}` : ""}{r.note ? ` · ${r.note}` : ""}</li>)}
        </ul>
      )}
      <p className="db-muted" style={{ marginTop: 12 }}>Attendance % = (Present + Late) ÷ all marked days.</p>
    </div>
  );
}
