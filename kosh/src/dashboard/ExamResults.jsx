import { useEffect, useState } from "react";
import { examResultService, getErrorMessage } from "../services";
import { useCollection, Gate } from "./useCollection";
import { useDashboard } from "./store";
import { downloadCSV } from "./utils";
import Modal from "./components/Modal";

const num = (v) => (Number.isInteger(v) ? v : Math.round(v * 100) / 100);

/* Teacher checks the written (subjective) answers of one student and gives marks. MCQ answers are already auto-checked. */
function GradeModal({ attempt, onClose, onSaved }) {
  const [full, setFull] = useState(null);
  const [marks, setMarks] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    examResultService.get(attempt.id).then((a) => {
      setFull(a);
      setMarks(Object.fromEntries(a.review.filter((r) => r.type === "Subjective" && r.awarded != null).map((r) => [r.id, String(r.awarded)])));
    }).catch((e) => setErr(getErrorMessage(e)));
  }, [attempt.id]);

  const subj = full ? full.review.filter((r) => r.type === "Subjective") : [];
  const save = async () => {
    const out = {};
    for (const r of subj) {
      const v = marks[r.id];
      if (v === undefined || v === "") continue;
      if (!(Number(v) >= 0 && Number(v) <= r.marks)) return setErr(`Marks must be between 0 and ${r.marks}.`);
      out[r.id] = Number(v);
    }
    setBusy(true); setErr("");
    try { await examResultService.grade(attempt.id, out); onSaved(); } catch (e) { setErr(getErrorMessage(e)); }
    setBusy(false);
  };
  return (
    <Modal title={`Check answers — ${attempt.studentName}`} onClose={onClose} wide>
      {!full && !err && <p className="db-muted">Loading answers…</p>}
      {full && (
        <>
          <p className="db-muted" style={{ marginTop: 0 }}>MCQ score (auto): <b>{num(full.mcqScore || 0)}</b> · {subj.length} subjective question{subj.length === 1 ? "" : "s"} to check.</p>
          {!subj.length && <p className="db-muted">This paper has no subjective questions.</p>}
          {subj.map((r, i) => (
            <div className="db-grade" key={r.id}>
              <b>Q{i + 1}. {r.question}</b> <small className="db-muted">[{r.marks} mark{r.marks > 1 ? "s" : ""}]</small>
              {r.model_answer && <p className="db-muted" style={{ margin: "6px 0 0", fontSize: 13 }}>Model answer: {r.model_answer}</p>}
              <div className="ans">{r.written ? r.written : <i>Not answered</i>}</div>
              <label>Marks given (0 – {r.marks}):{" "}
                <input className="db-input" type="number" min="0" max={r.marks} step="0.5" value={marks[r.id] ?? ""} onChange={(e) => { setMarks({ ...marks, [r.id]: e.target.value }); setErr(""); }} />
              </label>
              <button type="button" className="db-link-btn" style={{ marginLeft: 10 }} onClick={() => setMarks({ ...marks, [r.id]: "0" })}>0</button>
              <button type="button" className="db-link-btn" style={{ marginLeft: 6 }} onClick={() => setMarks({ ...marks, [r.id]: String(r.marks) })}>Full marks</button>
            </div>
          ))}
        </>
      )}
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onClose}>Cancel</button>
        <button type="button" className="kw-btn" onClick={save} disabled={busy || !full || !subj.length}>{busy ? "Saving…" : "Save marks"}</button>
      </div>
    </Modal>
  );
}

export default function ExamResults({ exam, onClose }) {
  const r = useCollection(examResultService);
  const { tests, setResultAnnounced, resetTest, refreshTests } = useDashboard();
  const [grading, setGrading] = useState(null);
  const [msg, setMsg] = useState("");
  const t = tests.find((x) => x.id === exam.id) || exam;
  const rows = (r.rows || []).filter((a) => a.examId === exam.id);
  const pending = rows.filter((a) => a.pendingReview).length;
  const pct = (a) => (a.total ? Math.round((a.score / a.total) * 100) : 0);

  const toggleAnnounce = async () => {
    if (!t.resultAnnounced && pending && !window.confirm(`${pending} student${pending > 1 ? "s have" : " has"} subjective answers not fully checked yet. Announce anyway? Their score will show only the marks given so far.`)) return;
    if (t.resultAnnounced && !window.confirm("Hide the result? Students will only see \"Submitted\" again.")) return;
    const res = await setResultAnnounced(exam.id, !t.resultAnnounced);
    setMsg(res.ok ? (t.resultAnnounced ? "Result hidden from students." : "Result announced — students can now see their marks and answers.") : res.error);
  };
  const resetOne = async (a) => {
    if (!window.confirm(`Reset the test for ${a.studentName}? Their answers and marks are deleted and they can write the test again.`)) return;
    try { await examResultService.reset(a.id); await r.load(); await refreshTests(); setMsg(`${a.studentName} can now write the test again.`); } catch (e) { setMsg(getErrorMessage(e)); }
  };
  const resetAll = async () => {
    if (!window.confirm(`Reset the WHOLE test "${exam.name}"? All ${rows.length} attempts are deleted, the result is hidden, and every student can write it again.`)) return;
    const res = await resetTest(exam.id);
    await r.load();
    setMsg(res.ok ? "Test reset for all students." : res.error);
  };
  const exportCsv = () => downloadCSV("exam-results.csv", [["Student", "Standard", "MCQ marks", "Subjective marks", "Score", "Total", "%", "Correct", "Wrong", "Unattempted", "Checking", "Submitted"],
    ...rows.map((a) => [a.studentName, a.standard, a.mcqScore ?? a.score, a.subjectiveScore ?? 0, a.score, a.total, pct(a), a.correct, a.wrong, a.unattempted, a.pendingReview ? "Pending" : "Done", a.submittedOn])]);

  return (
    <>
      <Modal title={`Results — ${exam.name}`} onClose={onClose} wide>
        <Gate cs={r} label="Loading results…">
          <div className="db-toolbar" style={{ alignItems: "center" }}>
            <span className={`db-badge-s ${t.resultAnnounced ? "completed" : "draft"}`}>{t.resultAnnounced ? "Result announced" : "Result not announced"}</span>
            <span className="db-muted grow">{rows.length} submitted{pending ? ` · ${pending} need checking` : ""}</span>
            <button type="button" className="kw-btn db-btn-sm" onClick={toggleAnnounce} disabled={!rows.length && !t.resultAnnounced}>{t.resultAnnounced ? "Hide result" : "Announce result"}</button>
            <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={resetAll} disabled={!rows.length}>Reset test (all)</button>
          </div>
          {msg && <p className="db-muted" role="status" style={{ margin: "0 0 8px" }}>{msg}</p>}
          {!rows.length ? <p className="db-muted">No student has submitted this exam yet.</p> : (
            <div className="db-scroll"><table className="db-rtable"><thead><tr><th>Student</th><th>Std</th><th>MCQ</th><th>Subj.</th><th>Score</th><th>%</th><th>R / W / Skip</th><th>Checking</th><th>Actions</th></tr></thead>
              <tbody>{[...rows].sort((a, b) => b.score - a.score).map((a) => (
                <tr key={a.id}>
                  <td><b>{a.studentName}</b></td><td>{a.standard}</td>
                  <td>{num(a.mcqScore ?? a.score)}</td><td>{a.hasSubjective ? num(a.subjectiveScore || 0) : "—"}</td>
                  <td><b>{num(a.score)}/{a.total}</b></td><td>{pct(a)}%</td>
                  <td>{a.correct} / {a.wrong} / {a.unattempted}</td>
                  <td>{!a.hasSubjective ? <span className="db-badge-s completed">Auto</span> : <span className={`db-badge-s ${a.pendingReview ? "pending" : "checked"}`}>{a.pendingReview ? "Pending" : "Checked"}</span>}</td>
                  <td><div className="db-actions">
                    {a.hasSubjective && <button type="button" className="kw-btn db-btn-sm" onClick={() => setGrading(a)}>{a.pendingReview ? "Check" : "Edit marks"}</button>}
                    <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => resetOne(a)}>Reset</button>
                  </div></td>
                </tr>
              ))}</tbody></table></div>
          )}
          <div className="db-modal-foot">
            <button type="button" className="kw-btn db-btn-line" disabled={!rows.length} onClick={exportCsv}>Export CSV</button>
            <button type="button" className="kw-btn" onClick={onClose}>Close</button>
          </div>
        </Gate>
      </Modal>
      {grading && <GradeModal attempt={grading} onClose={() => setGrading(null)} onSaved={async () => { setGrading(null); await r.load(); await refreshTests(); }} />}
    </>
  );
}
