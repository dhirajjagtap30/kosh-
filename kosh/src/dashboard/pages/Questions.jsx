import { useMemo, useState } from "react";
import { questionService } from "../../services";
import { useCollection, useForm, Gate } from "../useCollection";
import { STANDARDS, QUESTION_SUBJECTS } from "../data";
import { downloadCSV } from "../utils";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

export const LETTERS = ["A", "B", "C", "D"];
export const isSubj = (q) => q.type === "Subjective"; // old questions have no type => MCQ

function QuestionForm({ item, defaults, onSubmit, onCancel }) {
  const { f, setF, set, err, busy, submit } = useForm(
    item ? { type: "MCQ", modelAnswer: "", ...item, options: isSubj(item) ? ["", "", "", ""] : item.options } : { standard: defaults.standard, subject: defaults.subject, chapter: "", type: "MCQ", question: "", options: ["", "", "", ""], answer: 0, modelAnswer: "", marks: 1 },
    onSubmit,
    (v) => {
      if (!v.standard || !v.subject) return "Select standard and subject.";
      if (!v.question.trim()) return "Enter the question.";
      if (v.type === "MCQ" && v.options.some((o) => !o.trim())) return "Fill all 4 options.";
      if (!(Number(v.marks) > 0)) return "Marks must be greater than 0.";
      return "";
    }
  );
  const setOpt = (i) => (e) => setF((p) => ({ ...p, options: p.options.map((o, j) => (j === i ? e.target.value : o)) }));
  return (
    <form onSubmit={submit} noValidate>
      <div className="db-row2">
        <label className="db-field">Standard
          <select className="db-input" value={f.standard} onChange={set("standard")}><option value="">Select</option>{STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label className="db-field">Subject
          <select className="db-input" value={f.subject} onChange={set("subject")}><option value="">Select</option>{QUESTION_SUBJECTS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
      </div>
      <div className="db-seg" role="radiogroup" aria-label="Question type">
        {["MCQ", "Subjective"].map((t) => (
          <button type="button" key={t} role="radio" aria-checked={f.type === t} className={f.type === t ? "on" : ""} onClick={() => setF((p) => ({ ...p, type: t }))}>{t === "MCQ" ? "MCQ (auto-checked)" : "Subjective (teacher checks)"}</button>
        ))}
      </div>
      <label className="db-field">Chapter / topic (optional)<input className="db-input" value={f.chapter || ""} onChange={set("chapter")} /></label>
      <label className="db-field">Question<textarea className="db-input" rows={3} value={f.question} onChange={set("question")} autoFocus /></label>
      {f.type === "MCQ" ? (
        <>
          <p className="db-muted" style={{ margin: "0 0 6px" }}>Options — tick the correct answer</p>
          {f.options.map((o, i) => (
            <div key={i} className="db-opt-row">
              <input type="radio" name="correct" aria-label={`Option ${LETTERS[i]} is correct`} checked={Number(f.answer) === i} onChange={() => setF((p) => ({ ...p, answer: i }))} />
              <b>{LETTERS[i]}</b>
              <input className="db-input" value={o} onChange={setOpt(i)} placeholder={`Option ${LETTERS[i]}`} />
            </div>
          ))}
        </>
      ) : (
        <label className="db-field">Model answer / marking hint (optional — shown only to the teacher while checking)<textarea className="db-input" rows={3} value={f.modelAnswer || ""} onChange={set("modelAnswer")} /></label>
      )}
      <label className="db-field" style={{ marginTop: 10, maxWidth: 160 }}>Marks<input className="db-input" type="number" min="0.5" step="0.5" value={f.marks} onChange={set("marks")} /></label>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : item ? "Save changes" : "Add question"}</button>
      </div>
    </form>
  );
}

export default function Questions() {
  const c = useCollection(questionService);
  const [q, setQ] = useState("");
  const [std, setStd] = useState("All");
  const [sub, setSub] = useState("All");
  const [kind, setKind] = useState("All");
  const [modal, setModal] = useState(null);

  const rows = useMemo(() => (c.rows || [])
    .filter((r) => `${r.question} ${r.chapter || ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((r) => std === "All" || r.standard === std)
    .filter((r) => sub === "All" || r.subject === sub)
    .filter((r) => kind === "All" || (isSubj(r) ? "Subjective" : "MCQ") === kind), [c.rows, q, std, sub, kind]);
  const perStd = useMemo(() => STANDARDS.map((s) => ({ std: s, n: (c.rows || []).filter((r) => r.standard === s).length })), [c.rows]);

  const exportCsv = () => downloadCSV("question-bank.csv", [
    ["ID", "Standard", "Subject", "Chapter", "Type", "Question", "A", "B", "C", "D", "Correct answer / model answer", "Marks"],
    ...rows.map((r) => [r.id, r.standard, r.subject, r.chapter, isSubj(r) ? "Subjective" : "MCQ", r.question, ...(isSubj(r) ? ["", "", "", ""] : r.options), isSubj(r) ? r.modelAnswer || "" : LETTERS[r.answer], r.marks]),
  ]);

  const columns = [
    { key: "standard", label: "Std", sortable: true },
    { key: "subject", label: "Subject", sortable: true },
    { key: "type", label: "Type", render: (r) => <span className={`db-badge-s ${isSubj(r) ? "draft" : "scheduled"}`}>{isSubj(r) ? "Subjective" : "MCQ"}</span> },
    { key: "question", label: "Question", render: (r) => <><b>{r.question}</b>{isSubj(r) ? (r.modelAnswer ? <p className="db-muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Model answer: {r.modelAnswer}</p> : null) : <ol type="A" className="db-qopts">{r.options.map((o, i) => <li key={i} className={i === r.answer ? "ok" : ""}>{o}</li>)}</ol>}</> },
    { key: "answer", label: "Answer", render: (r) => (isSubj(r) ? <span className="db-muted">Teacher checks</span> : <b>{LETTERS[r.answer]}</b>) },
    { key: "marks", label: "Marks", sortable: true },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="db-actions">
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal(r)}>Edit</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => c.remove(r, "this question")}>Delete</button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Question Bank" sub="MCQ and subjective questions with marks — organised by standard and subject. Papers are built from these.">
        <button type="button" className="kw-btn db-btn-line" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
        <button type="button" className="kw-btn" onClick={() => setModal("new")} disabled={!c.rows}>Add question</button>
      </PageHeader>
      <Gate cs={c} label="Loading questions…">
        <div className="db-toolbar">
          <input className="db-input grow" type="search" placeholder="Search questions or chapter" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="db-input" aria-label="Standard" value={std} onChange={(e) => setStd(e.target.value)}><option value="All">All standards</option>{STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="db-input" aria-label="Subject" value={sub} onChange={(e) => setSub(e.target.value)}><option value="All">All subjects</option>{QUESTION_SUBJECTS.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="db-input" aria-label="Question type" value={kind} onChange={(e) => setKind(e.target.value)}><option value="All">MCQ + Subjective</option><option>MCQ</option><option>Subjective</option></select>
        </div>
        <div className="db-chips" aria-label="Questions per standard">
          {perStd.map((x) => <button type="button" key={x.std} className={std === x.std ? "on" : ""} onClick={() => setStd(std === x.std ? "All" : x.std)}>{x.std} <b>{x.n}</b></button>)}
        </div>
        <DataTable columns={columns} rows={rows} pageSize={6} initialSort={{ key: "standard", dir: "asc" }} emptyText="No questions match your filters." />
      </Gate>
      {modal && (
        <Modal title={modal === "new" ? "Add question" : "Edit question"} onClose={() => setModal(null)}>
          <QuestionForm item={modal === "new" ? null : modal} defaults={{ standard: std === "All" ? "" : std, subject: sub === "All" ? "" : sub }} onCancel={() => setModal(null)}
            onSubmit={async (f) => { const { id, ...body } = f; const subjective = f.type === "Subjective"; const res = await c.save(modal === "new" ? null : modal.id, { ...body, options: subjective ? [] : f.options, answer: subjective ? null : Number(f.answer), modelAnswer: subjective ? f.modelAnswer || "" : "", marks: Number(f.marks) }); if (res.ok) setModal(null); return res; }} />
        </Modal>
      )}
    </>
  );
}
