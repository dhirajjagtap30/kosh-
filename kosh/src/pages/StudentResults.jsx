import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { studentExamService, mockTestService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const pctOf = (a) => (a && a.total ? Math.round((a.score / a.total) * 100) : null);
const colorOf = (p) => (p == null ? "#8a94a6" : p >= 75 ? "#16a34a" : p >= 40 ? "#d97706" : "#dc2626");

/* "All Results" tab: every exam the student wrote (click to see the answer review) + the mock tests he practised. */
export default function StudentResults() {
  const [exams, setExams] = useState(null);
  const [mocks, setMocks] = useState([]);
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const load = () => {
    setErr("");
    studentExamService.list().then(setExams).catch((e) => setErr(getErrorMessage(e)));
    mockTestService.list().then(setMocks).catch(() => setMocks([]));
  };
  useEffect(load, []);

  const done = useMemo(() => (exams || []).filter((x) => x.myAttempt), [exams]);
  const marked = done.filter((x) => x.myAttempt.announced);
  const pcts = marked.map((x) => pctOf(x.myAttempt)).filter((v) => v != null);
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const best = pcts.length ? Math.max(...pcts) : null;
  const practised = mocks.filter((m) => m.attempts > 0);

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!exams) return <LoadingState label="Loading results…" />;
  return (
    <>
      <div className="kd-stats5 kd-full" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {[["📋", "#e0f0ff", done.length, "Tests written"], ["✅", "#dff7e6", marked.length, "Results out"], ["⏳", "#fff1cc", done.length - marked.length, "Result awaited"], ["📊", "#dbeafe", avg == null ? "--" : `${avg}%`, "Average"], ["🏆", "#fde7f3", best == null ? "--" : `${best}%`, "Best score"]].map(([ic, bg, n, l]) => (
          <div className="kd-stat" key={l}><div className="ic" style={{ background: bg }}>{ic}</div><b>{n}</b><span>{l}</span></div>
        ))}
      </div>

      <section className="kd-card kd-full">
        <h3>Test results</h3>
        <div className="in" style={{ display: "grid", gap: 12 }}>
          {!done.length && <div className="kd-empty">📊<br />You have not written any test yet</div>}
          {done.map((x) => {
            const a = x.myAttempt, p = a.announced ? pctOf(a) : null;
            return (
              <div key={x.id} style={{ border: "1px solid #e4e9f2", borderRadius: 14, padding: 16, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                  <b style={{ fontSize: 17, color: "#0a2463" }}>{x.title}</b>
                  <div style={{ color: "#3b4660", fontSize: 14, marginTop: 4 }}>{x.subject} · {fmt(`${x.date}T00:00:00`)} · {x.totalMarks} marks</div>
                  {a.announced && <div className="kd-bar" style={{ margin: "10px 0 0", maxWidth: 320 }}><div style={{ width: `${p}%`, background: colorOf(p) }} /></div>}
                </div>
                <div style={{ textAlign: "center", minWidth: 90 }}>
                  {a.announced ? <><b style={{ fontSize: 22, color: colorOf(p) }}>{a.score}/{a.total}</b><div style={{ fontSize: 13, color: "#8a94a6" }}>{p}%</div></> : <span style={{ color: "#b45309", fontWeight: 600, fontSize: 14 }}>Result awaited</span>}
                </div>
                <button type="button" className="kw-btn" onClick={() => navigate(`/student-exam/${x.id}`)}>{a.announced ? "View answers" : "View status"}</button>
              </div>
            );
          })}
        </div>
      </section>

      {practised.length > 0 && (
        <section className="kd-card kd-full">
          <h3>Mock test practice</h3>
          <div className="in" style={{ display: "grid", gap: 10 }}>
            {practised.map((m) => (
              <div key={m.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", border: "1px solid #e4e9f2", borderRadius: 12, padding: "12px 14px" }}>
                <div><b>{m.title}</b><div style={{ color: "#3b4660", fontSize: 14 }}>{m.attempts} attempt{m.attempts > 1 ? "s" : ""} · last {fmt(m.last && m.last.date)}</div></div>
                <div style={{ textAlign: "right" }}><b style={{ fontSize: 18 }}>{m.last.score}/{m.last.total}</b><div style={{ fontSize: 13, color: "#8a94a6" }}>Best {m.best}/{m.totalMarks}</div></div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
