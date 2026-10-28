import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { studentExamService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const L = ["A", "B", "C", "D"];
const css = `
.ex{--navy:#0a2463;--blue:#2563eb;min-height:100vh;background:#f3f6fc;color:#0a2463;font-family:'Poppins',system-ui,sans-serif}
.ex *{box-sizing:border-box}
.ex-top{background:#0a2463;color:#fff;padding:12px 20px;display:flex;gap:14px;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:5}
.ex-timer{background:rgba(255,255,255,.14);border-radius:999px;padding:6px 16px;font-weight:700;font-variant-numeric:tabular-nums}.ex-timer.low{background:#dc2626}
.ex-wrap{max-width:1000px;margin:0 auto;padding:20px;display:grid;grid-template-columns:1fr 220px;gap:20px;align-items:start}
.ex-card{background:#fff;border:1px solid #e4e9f2;border-radius:18px;padding:22px}
.ex-q{font-size:18px;font-weight:600;margin:6px 0 16px}
.ex-opt{display:flex;gap:12px;align-items:center;border:2px solid #e4e9f2;border-radius:12px;padding:12px 14px;margin-bottom:10px;cursor:pointer;background:#fff;width:100%;text-align:left;font:inherit;color:inherit}
.ex-opt:hover{border-color:#93c5fd}.ex-opt.on{border-color:#2563eb;background:#eaf2ff}
.ex-opt.ok{border-color:#16a34a;background:#e8f8ee}.ex-opt.bad{border-color:#dc2626;background:#fdecec}
.ex-opt b{width:28px;height:28px;border-radius:50%;background:#e4e9f2;display:grid;place-items:center;flex:none;font-size:13px}.ex-opt.on b{background:#2563eb;color:#fff}
.ex-nav{display:flex;justify-content:space-between;gap:10px;margin-top:18px;flex-wrap:wrap}
.ex-pal{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.ex-pal button{aspect-ratio:1;border:1px solid #cbd5e8;border-radius:10px;background:#fff;font:600 13px inherit;cursor:pointer}
.ex-pal button.done{background:#dcfce7;border-color:#86efac}.ex-pal button.cur{outline:2px solid #2563eb}
.ex-big{font-size:42px;font-weight:700;margin:6px 0}
.ex-ta{width:100%;min-height:180px;border:2px solid #e4e9f2;border-radius:12px;padding:12px 14px;font:inherit;color:inherit;resize:vertical}.ex-ta:focus{outline:0;border-color:#2563eb}
.ex-ans{background:#f6f8fd;border-radius:10px;padding:10px 12px;white-space:pre-wrap;margin:6px 0}
@media(max-width:760px){.ex-wrap{grid-template-columns:1fr}}
`;

const answered = (v) => v !== undefined && v !== null && String(v).trim() !== "";

function Result({ r, back }) {
  if (!r.announced) {
    return (
      <div className="ex-wrap" style={{ gridTemplateColumns: "1fr", maxWidth: 760 }}>
        <div className="ex-card" style={{ textAlign: "center" }}>
          <h2 style={{ margin: 0 }}>{r.examTitle}</h2>
          <div className="ex-big">✅</div>
          <b>Your answers are submitted.</b>
          <p style={{ color: "#3b4660" }}>Your result will be visible here once your teacher announces it.</p>
          <button type="button" className="kw-btn" style={{ marginTop: 8 }} onClick={back}>Back to dashboard</button>
        </div>
      </div>
    );
  }
  return (
    <div className="ex-wrap" style={{ gridTemplateColumns: "1fr", maxWidth: 760 }}>
      <div className="ex-card" style={{ textAlign: "center" }}>
        <h2 style={{ margin: 0 }}>{r.examTitle}</h2>
        <div className="ex-big">{r.score} / {r.total}</div>
        <div style={{ color: "#3b4660" }}>✅ {r.correct} correct · ❌ {r.wrong} wrong · ➖ {r.unattempted} not attempted (MCQ)</div>
        {r.review.some((q) => q.type === "Subjective") && <div style={{ color: "#3b4660", marginTop: 4 }}>MCQ marks: <b>{r.mcqScore}</b> · Written answers: <b>{r.subjectiveScore}</b></div>}
        <button type="button" className="kw-btn" style={{ marginTop: 16 }} onClick={back}>Back to dashboard</button>
      </div>
      {r.review.map((q, i) => q.type === "Subjective" ? (
        <div className="ex-card" key={q.id}>
          <small>Question {i + 1} · Written answer · {q.marks} mark{q.marks > 1 ? "s" : ""}</small>
          <div className="ex-q">{q.question}</div>
          <small>Your answer</small>
          <div className="ex-ans">{q.written || <i>Not answered</i>}</div>
          <b>{q.awarded === null || q.awarded === undefined ? "Marks: waiting for teacher to check" : `Marks: ${q.awarded} / ${q.marks}`}</b>
          {q.model_answer && <p style={{ color: "#3b4660", margin: "8px 0 0", fontSize: 14 }}>Model answer: {q.model_answer}</p>}
        </div>
      ) : (
        <div className="ex-card" key={q.id}>
          <small>Question {i + 1} · {q.marks} mark{q.marks > 1 ? "s" : ""}</small>
          <div className="ex-q">{q.question}</div>
          {q.options.map((o, j) => <div key={j} className={`ex-opt ${j === q.answer ? "ok" : j === q.chosen ? "bad" : ""}`}><b>{L[j]}</b>{o}{j === q.answer && " ✓"}{j === q.chosen && j !== q.answer && " (your answer)"}</div>)}
          {q.chosen === null && <small style={{ color: "#b45309" }}>Not attempted</small>}
        </div>
      ))}
    </div>
  );
}

export default function StudentExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [cur, setCur] = useState(0);
  const [ans, setAns] = useState({});
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const sent = useRef(false);
  const back = () => navigate("/student-dashboard", { replace: true });

  const start = useCallback(async () => {
    setErr("");
    try { setResult(await studentExamService.result(id)); return; } catch { /* not submitted yet */ }
    try { const e = await studentExamService.questions(id); setExam(e); setLeft(e.duration * 60); } catch (e) { setErr(getErrorMessage(e)); }
  }, [id]);
  useEffect(() => { start(); }, [start]);

  const submit = useCallback(async (auto) => {
    if (sent.current) return;
    if (!auto && !window.confirm("Submit the exam now? You cannot change answers after submitting.")) return;
    sent.current = true;
    setBusy(true);
    try { setResult(await studentExamService.submit(id, ans)); } catch (e) { sent.current = false; setErr(getErrorMessage(e)); }
    setBusy(false);
  }, [id, ans]);

  useEffect(() => {
    if (!exam || result) return undefined;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [exam, result]);
  useEffect(() => { if (exam && !result && left <= 0) submit(true); }, [left, exam, result, submit]);

  let body;
  if (result) body = <Result r={result} back={back} />;
  else if (err) body = <div style={{ padding: 20 }}><ErrorState message={err} onRetry={start} /><p style={{ textAlign: "center" }}><Link to="/student-dashboard">← Back to dashboard</Link></p></div>;
  else if (!exam) body = <LoadingState label="Loading exam…" />;
  else {
    const q = exam.questions[cur];
    const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, "0");
    const ss = String(Math.max(left, 0) % 60).padStart(2, "0");
    body = (
      <>
        <header className="ex-top"><b>{exam.title}</b><span className={`ex-timer ${left < 60 ? "low" : ""}`}>⏱ {mm}:{ss}</span></header>
        <div className="ex-wrap">
          <div className="ex-card">
            <small>Question {cur + 1} of {exam.questions.length} · {q.type === "Subjective" ? "Written answer · " : ""}{q.marks} mark{q.marks > 1 ? "s" : ""}</small>
            <div className="ex-q">{q.question}</div>
            {q.type === "Subjective" ? (
              <textarea className="ex-ta" aria-label="Your answer" placeholder="Write your answer here…" value={ans[q.id] || ""} onChange={(e) => setAns((a) => ({ ...a, [q.id]: e.target.value }))} />
            ) : q.options.map((o, j) => (
              <button type="button" key={j} className={`ex-opt ${ans[q.id] === j ? "on" : ""}`} onClick={() => setAns((a) => ({ ...a, [q.id]: j }))}><b>{L[j]}</b>{o}</button>
            ))}
            {q.type !== "Subjective" && ans[q.id] !== undefined && <button type="button" className="db-link-btn" style={{ background: "none", border: 0, color: "#2563eb", cursor: "pointer" }} onClick={() => setAns((a) => { const n = { ...a }; delete n[q.id]; return n; })}>Clear answer</button>}
            <div className="ex-nav">
              <button type="button" className="kw-btn db-btn-line" disabled={cur === 0} onClick={() => setCur(cur - 1)}>← Previous</button>
              {cur < exam.questions.length - 1
                ? <button type="button" className="kw-btn" onClick={() => setCur(cur + 1)}>Next →</button>
                : <button type="button" className="kw-btn" disabled={busy} onClick={() => submit(false)}>{busy ? "Submitting…" : "Submit exam"}</button>}
            </div>
          </div>
          <aside className="ex-card">
            <b>Questions</b>
            <div className="ex-pal" style={{ margin: "10px 0 14px" }}>
              {exam.questions.map((x, i) => <button type="button" key={x.id} className={`${answered(ans[x.id]) ? "done" : ""} ${i === cur ? "cur" : ""}`} onClick={() => setCur(i)}>{i + 1}</button>)}
            </div>
            <small style={{ color: "#3b4660" }}>{exam.questions.filter((x) => answered(ans[x.id])).length} of {exam.questions.length} answered</small>
            <button type="button" className="kw-btn" style={{ width: "100%", marginTop: 12 }} disabled={busy} onClick={() => submit(false)}>Submit exam</button>
          </aside>
        </div>
      </>
    );
  }
  return <div className="ex"><style>{css}</style>{body}</div>;
}
