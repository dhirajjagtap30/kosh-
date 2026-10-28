import { useCallback, useEffect, useRef, useState } from "react";
import { mockTestService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const L = ["A", "B", "C", "D"];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "");
const optStyle = (on, cls) => ({ display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer", padding: "11px 14px", marginBottom: 8, borderRadius: 12, background: cls === "ok" ? "#e8f8ee" : cls === "bad" ? "#fdecec" : on ? "#eaf2ff" : "#fff", border: `2px solid ${cls === "ok" ? "#16a34a" : cls === "bad" ? "#dc2626" : on ? "#2563eb" : "#e4e9f2"}` });
const badge = { width: 26, height: 26, borderRadius: "50%", background: "#e4e9f2", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flex: "none" };

/* One mock test being written (inside the dashboard, no page change). Practice only: instant result, can be repeated. */
function Runner({ test, onDone }) {
  const [q, setQ] = useState(null);
  const [err, setErr] = useState("");
  const [ans, setAns] = useState({});
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(0);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const sent = useRef(false);

  useEffect(() => { mockTestService.questions(test.id).then((d) => { setQ(d); setLeft(d.duration * 60); }).catch((e) => setErr(getErrorMessage(e))); }, [test.id]);

  const submit = useCallback(async () => {
    if (sent.current || !q) return;
    sent.current = true; setBusy(true);
    try { setRes(await mockTestService.submit(test.id, ans)); } catch (e) { sent.current = false; setErr(getErrorMessage(e)); } finally { setBusy(false); }
  }, [q, ans, test.id]);

  useEffect(() => {
    if (!q || res) return undefined;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [q, res]);
  useEffect(() => { if (q && !res && left <= 0) submit(); }, [left, q, res, submit]);

  if (err && !q) return <ErrorState message={err} onRetry={onDone} />;
  if (!q) return <LoadingState label="Loading mock test…" />;

  if (res) {
    return (
      <section className="kd-card kd-full">
        <h3>{res.title} — Result</h3>
        <div className="in">
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 44, fontWeight: 700 }}>{res.score} / {res.total}</div>
            <div style={{ color: "#3b4660" }}>✅ {res.correct} correct · ❌ {res.wrong} wrong · ➖ {res.unattempted} not attempted</div>
            <button type="button" className="kw-btn" style={{ marginTop: 14 }} onClick={onDone}>Back to mock tests</button>
          </div>
          {res.review.map((r, n) => (
            <div key={r.id} style={{ borderTop: "1px solid #e4e9f2", padding: "14px 0" }}>
              <small style={{ color: "#8a94a6" }}>Question {n + 1} · {r.marks} mark{r.marks > 1 ? "s" : ""}</small>
              <div style={{ fontWeight: 600, margin: "4px 0 10px" }}>{r.question}</div>
              {r.options.map((o, k) => <div key={k} style={optStyle(false, k === r.answer ? "ok" : k === r.chosen ? "bad" : "")}><span style={badge}>{L[k]}</span>{o}{k === r.answer ? " ✔" : k === r.chosen ? " ✖ (your answer)" : ""}</div>)}
            </div>
          ))}
        </div>
      </section>
    );
  }

  const cur = q.questions[i];
  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, "0"), ss = String(Math.max(left, 0) % 60).padStart(2, "0");
  return (
    <section className="kd-card kd-full">
      <h3 style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span>{q.title}</span>
        <span style={{ background: left < 60 ? "#dc2626" : "#e0edff", color: left < 60 ? "#fff" : "#1d4ed8", borderRadius: 999, padding: "4px 14px", fontSize: 15, fontVariantNumeric: "tabular-nums" }}>⏱ {mm}:{ss}</span>
      </h3>
      <div className="in">
        <small style={{ color: "#8a94a6" }}>Question {i + 1} of {q.questions.length} · {cur.marks} mark{cur.marks > 1 ? "s" : ""}</small>
        <div style={{ fontSize: 18, fontWeight: 600, margin: "6px 0 14px" }}>{cur.question}</div>
        {cur.options.map((o, k) => <button key={k} type="button" style={optStyle(ans[cur.id] === k)} onClick={() => setAns((a) => ({ ...a, [cur.id]: k }))}><span style={{ ...badge, background: ans[cur.id] === k ? "#2563eb" : "#e4e9f2", color: ans[cur.id] === k ? "#fff" : "inherit" }}>{L[k]}</span>{o}</button>)}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "14px 0" }}>
          {q.questions.map((x, n) => <button key={x.id} type="button" aria-label={`Question ${n + 1}`} onClick={() => setI(n)} style={{ width: 34, height: 34, borderRadius: 9, border: n === i ? "2px solid #2563eb" : "1px solid #cbd5e8", background: ans[x.id] !== undefined ? "#dcfce7" : "#fff", font: "600 13px inherit", cursor: "pointer" }}>{n + 1}</button>)}
        </div>
        {err && <p role="alert" style={{ color: "#dc2626" }}>{err}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="kw-btn" disabled={i === 0} onClick={() => setI(i - 1)}>← Previous</button>
          {i < q.questions.length - 1 ? <button type="button" className="kw-btn" onClick={() => setI(i + 1)}>Next →</button>
            : <button type="button" className="kw-btn" disabled={busy} onClick={() => { if (window.confirm("Submit this mock test?")) submit(); }}>{busy ? "Submitting…" : "Submit"}</button>}
        </div>
      </div>
    </section>
  );
}

/* "Mock Tests" tab: practice papers of the student's standard (auto-checked, any number of attempts). */
export default function StudentMockTests() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [active, setActive] = useState(null);
  const [sub, setSub] = useState("All");
  const load = useCallback(() => { setErr(""); mockTestService.list().then(setRows).catch((e) => setErr(getErrorMessage(e))); }, []);
  useEffect(() => { if (!active) load(); }, [active, load]);

  if (active) return <Runner test={active} onDone={() => setActive(null)} />;
  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!rows) return <LoadingState label="Loading mock tests…" />;
  const subjects = [...new Set(rows.map((r) => r.subject))].sort();
  const list = rows.filter((r) => sub === "All" || r.subject === sub);
  return (
    <section className="kd-card kd-full">
      <h3>Mock Tests</h3>
      <div className="in" style={{ display: "grid", gap: 14 }}>
        <select aria-label="Subject" value={sub} onChange={(e) => setSub(e.target.value)} style={{ border: "1px solid #cbd5e8", borderRadius: 10, padding: "8px 12px", font: "inherit", color: "#0a2463", background: "#fff", maxWidth: 260 }}>
          <option value="All">All subjects</option>{subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        {!list.length && <div className="kd-empty">📝<br />No mock tests for your standard yet</div>}
        {list.map((x) => (
          <div key={x.id} style={{ border: "1px solid #e4e9f2", borderRadius: 14, padding: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 17, color: "#0a2463" }}>📝 {x.title}</b>
              <div style={{ color: "#3b4660", fontSize: 14, marginTop: 4 }}>{x.subject} · {x.questionCount} questions · {x.totalMarks} marks · {x.duration} min</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#8a94a6" }}>{x.attempts ? `Attempted ${x.attempts}× · last ${x.last.score}/${x.last.total} (${fmtDate(x.last.date)}) · best ${x.best}` : "Not attempted yet"}</div>
            </div>
            <button type="button" className="kw-btn" onClick={() => setActive(x)}>{x.attempts ? "Try again" : "Start mock test"}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
