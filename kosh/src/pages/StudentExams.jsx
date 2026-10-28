import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { studentExamService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const chip = { Live: ["#dcfce7", "#15803d"], Scheduled: ["#fef3c7", "#b45309"], Closed: ["#e5e7eb", "#4b5563"] };

/* "Tests" tab of the Student Dashboard: exams created by the admin for the student's standard. */
export default function StudentExams() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const load = () => { setErr(""); studentExamService.list().then(setRows).catch((e) => setErr(getErrorMessage(e))); };
  useEffect(load, []);

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!rows) return <LoadingState label="Loading exams…" />;
  return (
    <section className="kd-card">
      <h3>My Exams</h3>
      <div className="in" style={{ display: "grid", gap: 14 }}>
        {!rows.length && <div className="kd-empty">📅<br />No exams for your standard yet</div>}
        {rows.map((x) => {
          const [bg, fg] = chip[x.status] || chip.Closed;
          const done = Boolean(x.myAttempt);
          return (
            <div key={x.id} style={{ border: "1px solid #e4e9f2", borderRadius: 14, padding: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <b style={{ fontSize: 17, color: "#0a2463" }}>{x.title}</b>
                <div style={{ color: "#3b4660", fontSize: 14, marginTop: 4 }}>{x.subject} · {fmt(x.date)} · {x.questionCount} questions · {x.totalMarks} marks · {x.duration} min</div>
                <span style={{ display: "inline-block", marginTop: 8, background: bg, color: fg, borderRadius: 999, padding: "2px 10px", fontSize: 13, fontWeight: 700 }}>{done ? "Submitted" : x.status}</span>
                {done && (x.myAttempt.announced ? <b style={{ marginLeft: 10 }}>Score: {x.myAttempt.score}/{x.myAttempt.total}</b> : <span style={{ marginLeft: 10, color: "#b45309", fontWeight: 600, fontSize: 14 }}>Result awaited</span>)}
              </div>
              {done ? <button type="button" className="kw-btn" onClick={() => navigate(`/student-exam/${x.id}`)}>{x.myAttempt.announced ? "View result" : "View status"}</button>
                : x.status === "Live" ? <button type="button" className="kw-btn" onClick={() => navigate(`/student-exam/${x.id}`)}>Start exam</button>
                : <span style={{ color: "#3b4660", fontSize: 14, fontWeight: 500 }}>{x.status === "Scheduled" ? "Not started yet" : "Exam closed"}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
