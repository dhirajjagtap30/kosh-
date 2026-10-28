import { useMemo } from "react";
import { Link } from "react-router-dom";
import { attendanceService, batchService, registrationService, testService, materialService, paperService } from "../../services";
import { useAuth } from "../../auth/AuthContext";
import { useCollection, Gate } from "../useCollection";
import { localToday } from "../attendanceTools";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { useEffect, useState } from "react";
import "./teacher.css";

const ACTIONS = [
  ["/dashboard/batches", "👪", "Create batch", "Make a batch and add or remove students any time."],
  ["/dashboard/tests", "📋", "Assign test", "Create a test and assign it to one or more batches."],
  ["/dashboard/papers", "🗂️", "Set question paper", "Auto or manual paper from the question bank."],
  ["/dashboard/materials", "📚", "Send notes", "Upload notes / video links for a standard or batch."],
  ["/dashboard/notify", "🔔", "Send notification", "Message a standard, batches or chosen students."],
  ["/dashboard/attendance", "🗓️", "Mark attendance", "Present / Absent / Late / Leave, or import biometric."],
  ["/dashboard/teacher-reports", "📄", "All reports", "Batch, test, attendance and student reports."],
  ["/dashboard/messages", "💬", "Messages", "Reply to students and parents."],
];

export default function TeacherHome() {
  const { user } = useAuth();
  const rc = useCollection(registrationService);
  const bc = useCollection(batchService);
  const tc = useCollection(testService);
  const mc = useCollection(materialService);
  const pc = useCollection(paperService);
  const [att, setAtt] = useState(null);
  const today = localToday();
  useEffect(() => { attendanceService.list(today, today).then(setAtt).catch(() => setAtt([])); }, [today]);

  const stats = useMemo(() => {
    const regs = (rc.rows || []).filter((r) => r.status !== "Inactive");
    const marked = att ? att.length : 0;
    const present = att ? att.filter((a) => a.status === "Present" || a.status === "Late").length : 0;
    return { students: regs.length, marked, present, live: (tc.rows || []).filter((t) => t.status === "Scheduled").length };
  }, [rc.rows, att, tc.rows]);

  return (
    <>
      <PageHeader title={`Welcome${user && user.name ? `, ${user.name}` : ""}`} sub="Your teaching tools in one place — pick an action below." />
      <Gate cs={[rc, bc, tc, mc, pc]} label="Loading your dashboard…">
        <div className="db-stats">
          <StatCard icon="🎓" label="Active students" value={stats.students} tone="blue" />
          <StatCard icon="👪" label="Batches" value={(bc.rows || []).length} tone="teal" />
          <StatCard icon="📋" label="Scheduled tests" value={stats.live} note={`${(pc.rows || []).filter((p) => p.status === "Published").length} papers published`} tone="orange" />
          <StatCard icon="🗓️" label="Attendance today" value={att ? (stats.marked ? `${stats.present}/${stats.marked}` : "Not marked") : "…"} note={stats.marked ? "present / marked" : "Open Attendance to mark"} tone="blue" />
        </div>
        <h3 className="db-sec-title">Quick actions</h3>
        <div className="tq-grid">
          {ACTIONS.map(([to, ic, t, d]) => (
            <Link key={to} to={to} className="tq"><span className="ic" aria-hidden="true">{ic}</span><b>{t}</b><span className="d">{d}</span></Link>
          ))}
        </div>
        <h3 className="db-sec-title">Your batches</h3>
        <div className="kw-panel">
          {!(bc.rows || []).length ? <p className="db-muted">No batches yet. <Link to="/dashboard/batches">Create your first batch</Link>.</p> : (
            <div className="db-scroll"><table className="db-rtable"><thead><tr><th>Batch</th><th>Std</th><th>Students</th></tr></thead>
              <tbody>{bc.rows.map((b) => <tr key={b.id}><td><b>{b.name}</b></td><td>{b.standard}</td><td>{(b.studentIds || []).length}</td></tr>)}</tbody></table></div>
          )}
        </div>
      </Gate>
    </>
  );
}
