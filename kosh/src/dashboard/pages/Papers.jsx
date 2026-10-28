import { currentBrand, useBrand } from "../../branding/BrandContext";
import { useMemo, useState } from "react";
import { paperService, questionService } from "../../services";
import { useCollection, useForm, Gate } from "../useCollection";
import { STANDARDS, QUESTION_SUBJECTS } from "../data";
import { fmtDate } from "../utils";
import { LETTERS, isSubj } from "./Questions";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Opens a clean printable copy (question paper, or answer key with `answers`).
   Two-column A4 layout with circled question numbers, so 20-40 questions fit on one or two pages. */
const LAYOUTS = [["single", "Single column"], ["double", "Double column"]];
function printPaper(p, qs, answers, layout = "double") {
  const n = qs.length;
  const total = qs.reduce((t, q) => t + Number(q.marks), 0);
  const cols = layout === "single" ? 1 : 2;
  const fs = (n > 30 ? 11 : n > 20 ? 12 : 13) + (cols === 1 ? 1 : 0); // smaller text when there are many questions; a bit larger for single column
  const body = qs.map((q, i) => {
    if (isSubj(q)) return `<div class="q"><span class="n">${i + 1}</span><div class="qb"><div class="qt">${esc(q.question)} <span class="m">[${q.marks}]</span></div>${answers ? `<div class="a">Model answer: ${esc(q.modelAnswer || "—")}</div>` : '<div class="ln"></div><div class="ln"></div><div class="ln"></div>'}</div></div>`;
    const opts = q.options.map((o, j) => `<div class="o${answers && j === q.answer ? " ok" : ""}"><b>${LETTERS[j]}.</b> ${esc(o)}</div>`).join("");
    return `<div class="q"><span class="n">${i + 1}</span><div class="qb"><div class="qt">${esc(q.question)} <span class="m">[${q.marks}]</span></div><div class="os">${opts}</div>${answers ? `<div class="a">Answer: ${LETTERS[q.answer]}</div>` : ""}</div></div>`;
  }).join("");
  const info = answers ? "" : `<table class="info"><tr><td class="l">Name</td><td></td><td class="l">Roll No.</td><td></td></tr><tr><td class="l">Date</td><td></td><td class="l">Batch</td><td></td></tr></table>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(p.title)}</title><style>
@page{size:A4;margin:10mm}
body{font:${fs}px/1.35 Arial,sans-serif;margin:0;padding:16px}
@media print{body{padding:0}}
h1{text-align:center;margin:0;font-size:22px}
.sub{text-align:center;color:#333;margin:2px 0 8px}
.info{width:100%;border-collapse:collapse;margin-bottom:8px}
.info td{border:1px solid #000;padding:4px 6px;height:18px}
.info td.l{width:13%;font-weight:700;background:#f2f2f2}
.cols{column-count:${cols};column-gap:26px;column-rule:1px solid #000;border-top:2px solid #000;padding-top:8px}
.q{display:flex;gap:7px;break-inside:avoid;margin-bottom:9px}
.n{flex:none;width:21px;height:21px;box-sizing:border-box;border:1.5px solid #000;border-radius:50%;text-align:center;line-height:18px;font-size:11px;font-weight:700}
.qb{flex:1;min-width:0}
.qt{font-weight:700}
.m{font-weight:400;color:#555;font-size:.9em}
.os{display:grid;grid-template-columns:1fr 1fr;gap:1px 10px;margin-top:3px}
.ok{font-weight:700;text-decoration:underline}
.a{font-weight:700;margin-top:2px}
.ln{border-bottom:1px solid #777;height:22px}
</style><h1>${esc(currentBrand().instituteName)}</h1><div class="sub">${esc(p.title)} — Std ${esc(p.standard)} — ${esc(p.subject)}<br>Time: ${p.duration} min &nbsp; Total marks: ${total} ${answers ? "&nbsp; (ANSWER KEY)" : ""}</div>${info}<div class="cols">${body}</div><script>window.onload=()=>window.print()<\/script>`);
  w.document.close();
}

const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

/* AUTO: pick `count` random questions from the pool. If `target` marks is given, the picked questions add up to exactly that
   (0/1 knapsack over the shuffled pool, marks counted in half-marks, so every click gives a different valid set). */
function autoPick(pool, count, target) {
  if (!(count >= 1)) return { error: "Enter the number of questions." };
  if (count > pool.length) return { error: `Only ${pool.length} matching question${pool.length === 1 ? "" : "s"} in the Question Bank — add more or reduce the count.` };
  const items = shuffle(pool);
  if (target === "" || target == null) return { ids: items.slice(0, count).map((q) => q.id) };
  const T = Math.round(Number(target) * 2);
  if (!(T > 0)) return { error: "Total marks must be greater than 0." };
  const w = items.map((q) => Math.round(q.marks * 2));
  const parent = Array.from({ length: count + 1 }, () => new Map()); // parent[k].get(sum) = index of the last question used
  parent[0].set(0, -1);
  items.forEach((_, i) => {
    for (let k = Math.min(i + 1, count); k >= 1; k--) {
      parent[k - 1].forEach((_v, sum) => { const ns = sum + w[i]; if (ns <= T && !parent[k].has(ns)) parent[k].set(ns, i); });
    }
  });
  if (!parent[count].has(T)) return { error: `Cannot pick exactly ${count} questions that add up to ${target} marks from the available questions. Change the count / marks, or add questions with suitable marks.` };
  const ids = [];
  for (let k = count, sum = T; k > 0; k--) { const i = parent[k].get(sum); ids.push(items[i].id); sum -= w[i]; }
  return { ids: shuffle(ids) };
}

/* A4 sheet (794 x 1123 px = 210 x 297 mm at 96 dpi). Same look as the printed paper. Red dashed lines = where a new A4 page starts (approximate). */
function PaperBody({ meta, qs, answers, layout = "double" }) {
  const { brand } = useBrand();
  const n = qs.length;
  const fs = (n > 30 ? 11 : n > 20 ? 12 : 13) + (layout === "single" ? 1 : 0);
  const total = qs.reduce((t, q) => t + Number(q.marks), 0);
  return (
    <div className="db-a4-wrap">
      <div className={`db-a4 ${layout}`} style={{ fontSize: fs }}>
        <h4>{brand.instituteName}</h4>
        <div className="sub">{meta.title || "Untitled paper"} — Std {meta.standard || "—"} — {meta.subject || "—"}<br />Time: {meta.duration} min &nbsp; Total marks: {total}{answers ? " (ANSWER KEY)" : ""}</div>
        {!answers && <table className="info"><tbody><tr><td className="l">Name</td><td></td><td className="l">Roll No.</td><td></td></tr><tr><td className="l">Date</td><td></td><td className="l">Batch</td><td></td></tr></tbody></table>}
        {!n ? <p className="db-muted" style={{ textAlign: "center" }}>No questions selected yet.</p> : (
          <div className="cols">
            {qs.map((q, i) => (
              <div className="q" key={q.id}>
                <span className="n">{i + 1}</span>
                <div className="qb">
                  <div className="qt">{q.question} <span className="m">[{q.marks}]</span></div>
                  {isSubj(q)
                    ? (answers ? <div className="a">Model answer: {q.modelAnswer || "—"}</div> : <><div className="ln" /><div className="ln" /><div className="ln" /></>)
                    : <div className="os">{q.options.map((o, j) => <div key={j} className={answers && j === q.answer ? "ok" : ""}><b>{LETTERS[j]}.</b> {o}</div>)}</div>}
                  {answers && !isSubj(q) && <div className="a">Answer: {LETTERS[q.answer]}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LayoutPicker({ value, onChange }) {
  return (
    <div className="db-seg" role="radiogroup" aria-label="A4 layout" style={{ margin: "0 0 10px" }}>
      {LAYOUTS.map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{k === "single" ? "▯ " : "▯▯ "}{l} (A4)</button>)}
    </div>
  );
}

function PaperForm({ item, questions, onSubmit, onCancel }) {
  const { f, setF, set, err, busy, submit } = useForm(
    item ? { ...item } : { title: "", standard: "", subject: "", duration: 60, status: "Draft", questionIds: [] },
    onSubmit,
    (v) => {
      if (!v.title.trim()) return "Enter the paper title.";
      if (!v.standard || !v.subject) return "Select standard and subject.";
      if (!(Number(v.duration) >= 1)) return "Duration must be at least 1 minute.";
      if (!v.questionIds.length) return "Select at least one question.";
      return "";
    }
  );
  const [mode, setMode] = useState("auto"); // auto | manual
  const [auto, setAuto] = useState({ kind: "All", count: 10, marks: "" });
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(false);
  const [layout, setLayout] = useState("double");

  const pool = useMemo(() => questions.filter((q) => q.standard === f.standard && q.subject === f.subject), [questions, f.standard, f.subject]);
  const byId = useMemo(() => new Map(pool.map((q) => [q.id, q])), [pool]);
  const chosen = f.questionIds.map((id) => byId.get(id)).filter(Boolean); // keeps the paper order
  const total = chosen.reduce((s, q) => s + q.marks, 0);
  const shown = pool.filter((q) => q.question.toLowerCase().includes(search.trim().toLowerCase()));
  const nMcq = pool.filter((q) => !isSubj(q)).length;
  const nSub = pool.length - nMcq;

  const pickScope = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value, questionIds: [] })); setNote(""); }; // changing std/subject clears the selection
  const toggle = (id) => setF((p) => ({ ...p, questionIds: p.questionIds.includes(id) ? p.questionIds.filter((x) => x !== id) : [...p.questionIds, id] }));
  const setIds = (ids) => setF((p) => ({ ...p, questionIds: ids }));

  const generate = () => {
    const cand = pool.filter((q) => auto.kind === "All" || (auto.kind === "Subjective") === isSubj(q));
    const r = autoPick(cand, Number(auto.count), auto.marks === "" ? "" : Number(auto.marks));
    if (r.error) return setNote(r.error);
    setIds(r.ids);
    setNote("");
  };
  /* CHANGE QUESTION: swap one selected question with another unused one of the same type (same marks first) */
  const change = (id) => {
    const cur = byId.get(id);
    const free = pool.filter((q) => !f.questionIds.includes(q.id) && isSubj(q) === isSubj(cur));
    const same = free.filter((q) => q.marks === cur.marks);
    const options = same.length ? same : free;
    if (!options.length) return setNote("No other unused question of this type is available to swap in.");
    const nq = options[Math.floor(Math.random() * options.length)];
    setIds(f.questionIds.map((x) => (x === id ? nq.id : x)));
    setNote(same.length ? "" : `No unused question with ${cur.marks} mark${cur.marks > 1 ? "s" : ""} — swapped with a ${nq.marks}-mark question, so the total changed.`);
  };
  const move = (i, d) => { const a = [...f.questionIds]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setIds(a); };

  return (
    <form onSubmit={submit} noValidate>
      <label className="db-field">Paper title<input className="db-input" value={f.title} onChange={set("title")} placeholder="e.g. 10th Maths - Unit Test 1" autoFocus /></label>
      <div className="db-row2">
        <label className="db-field">Standard<select className="db-input" value={f.standard} onChange={pickScope("standard")}><option value="">Select</option>{STANDARDS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="db-field">Subject<select className="db-input" value={f.subject} onChange={pickScope("subject")}><option value="">Select</option>{QUESTION_SUBJECTS.map((x) => <option key={x}>{x}</option>)}</select></label>
      </div>
      <div className="db-row2">
        <label className="db-field">Duration (minutes)<input className="db-input" type="number" min="1" value={f.duration} onChange={set("duration")} /></label>
        <label className="db-field">Status<select className="db-input" value={f.status} onChange={set("status")}><option>Draft</option><option>Published</option></select></label>
      </div>

      <div className="db-seg" role="tablist" aria-label="How to choose questions">
        <button type="button" role="tab" aria-selected={mode === "auto"} className={mode === "auto" ? "on" : ""} onClick={() => setMode("auto")}>⚡ Auto — by number of questions &amp; marks</button>
        <button type="button" role="tab" aria-selected={mode === "manual"} className={mode === "manual" ? "on" : ""} onClick={() => setMode("manual")}>☑ Manual select</button>
      </div>

      {!f.standard || !f.subject ? <p className="db-muted">Choose standard and subject to see its questions.</p>
        : !pool.length ? <p className="db-muted">No questions for {f.standard} {f.subject}. Add them in the Question Bank first.</p>
        : mode === "auto" ? (
          <div className="db-auto">
            <p className="db-muted" style={{ margin: "0 0 8px" }}>Available: {nMcq} MCQ · {nSub} subjective. Questions are picked at random — click again for a different set.</p>
            <div className="db-row2">
              <label className="db-field">Question type<select className="db-input" value={auto.kind} onChange={(e) => setAuto({ ...auto, kind: e.target.value })}><option value="All">MCQ + Subjective</option><option>MCQ</option><option>Subjective</option></select></label>
              <label className="db-field">No. of questions<input className="db-input" type="number" min="1" value={auto.count} onChange={(e) => setAuto({ ...auto, count: e.target.value })} /></label>
            </div>
            <div className="db-row2">
              <label className="db-field">Total marks (optional)<input className="db-input" type="number" min="0.5" step="0.5" value={auto.marks} placeholder="Any" onChange={(e) => setAuto({ ...auto, marks: e.target.value })} /></label>
              <div className="db-field" style={{ justifyContent: "flex-end" }}><button type="button" className="kw-btn" onClick={generate}>{f.questionIds.length ? "Generate again" : "Generate paper"}</button></div>
            </div>
          </div>
        ) : (
          <>
            <div className="db-pick-head">
              <input className="db-input grow" type="search" placeholder="Search questions" aria-label="Search questions" value={search} onChange={(e) => setSearch(e.target.value)} />
              <button type="button" className="db-link-btn" onClick={() => setIds(chosen.length === pool.length ? [] : pool.map((q) => q.id))}>{chosen.length === pool.length ? "Clear all" : "Select all"}</button>
            </div>
            <div className="db-pick">
              {!shown.length ? <p className="db-muted">No question matches your search.</p> : shown.map((q) => (
                <label key={q.id} className="db-pick-row">
                  <input type="checkbox" checked={f.questionIds.includes(q.id)} onChange={() => toggle(q.id)} />
                  <span><span className={`db-tag ${isSubj(q) ? "" : "m"}`}>{isSubj(q) ? "SUBJ" : "MCQ"}</span>{q.question}<small className="db-muted"> — {isSubj(q) ? "" : `Ans ${LETTERS[q.answer]} · `}{q.marks} mark{q.marks > 1 ? "s" : ""}</small></span>
                </label>
              ))}
            </div>
          </>
        )}
      {note && <p className="db-err" role="status">{note}</p>}

      <div className="db-pick-head">
        <b>Selected questions ({chosen.length} · {total} marks)</b>
        <button type="button" className="db-link-btn" onClick={() => setPreview((v) => !v)} disabled={!chosen.length}>{preview ? "Hide preview" : "Preview paper (A4)"}</button>
      </div>
      {chosen.length > 0 && (
        <div className="db-sel">
          {chosen.map((q, i) => (
            <div key={q.id} className="db-sel-row">
              <b>{i + 1}.</b>
              <span><span className={`db-tag ${isSubj(q) ? "" : "m"}`}>{isSubj(q) ? "SUBJ" : "MCQ"}</span>{q.question}<small className="db-muted"> — {q.marks} mark{q.marks > 1 ? "s" : ""}</small></span>
              <div className="db-actions">
                <button type="button" className="kw-btn db-btn-sm db-btn-line" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" className="kw-btn db-btn-sm db-btn-line" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === chosen.length - 1}>↓</button>
                <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => change(q.id)}>Change</button>
                <button type="button" className="kw-btn db-btn-sm db-btn-danger" aria-label="Remove question" onClick={() => toggle(q.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {preview && <><LayoutPicker value={layout} onChange={setLayout} /><PaperBody meta={f} qs={chosen} answers={false} layout={layout} /></>}
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : "Save paper"}</button>
      </div>
    </form>
  );
}

function PaperView({ paper, questions, onClose }) {
  const [ans, setAns] = useState(false);
  const [layout, setLayout] = useState("double");
  const qs = paper.questionIds.map((id) => questions.find((q) => q.id === id)).filter(Boolean);
  return (
    <Modal title={`Preview — ${paper.title}`} onClose={onClose} wide>
      <LayoutPicker value={layout} onChange={setLayout} />
      <label style={{ display: "flex", gap: 8, marginBottom: 10 }}><input type="checkbox" checked={ans} onChange={(e) => setAns(e.target.checked)} /> Show answers (answer key)</label>
      <PaperBody meta={paper} qs={qs} answers={ans} layout={layout} />
      <p className="db-muted" style={{ margin: "0 0 4px", fontSize: 13 }}>Shown at real A4 size. Red dashed lines mark where a new page starts. Print opens the paper in the chosen layout — choose “Save as PDF” in the print window to get a PDF.</p>
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={() => printPaper(paper, qs, false, layout)}>🖨 Print paper</button>
        <button type="button" className="kw-btn" onClick={() => printPaper(paper, qs, true, layout)}>🖨 Print answer key</button>
      </div>
    </Modal>
  );
}

export default function Papers() {
  const c = useCollection(paperService);
  const qc = useCollection(questionService);
  const [std, setStd] = useState("All");
  const [sub, setSub] = useState("All");
  const [modal, setModal] = useState(null); // "new" | row (edit)
  const [view, setView] = useState(null);

  const rows = (c.rows || []).filter((r) => (std === "All" || r.standard === std) && (sub === "All" || r.subject === sub));
  const columns = [
    { key: "title", label: "Paper", sortable: true, render: (r) => <b>{r.title}</b> },
    { key: "standard", label: "Std", sortable: true },
    { key: "subject", label: "Subject", sortable: true },
    { key: "count", label: "Questions", render: (r) => r.questionIds.length },
    { key: "totalMarks", label: "Marks", sortable: true },
    { key: "duration", label: "Time", sortable: true, render: (r) => `${r.duration} min` },
    { key: "createdOn", label: "Created", sortable: true, render: (r) => (r.createdOn ? fmtDate(r.createdOn) : "—") },
    { key: "status", label: "Status", sortable: true, render: (r) => <span className={`db-badge-s ${r.status === "Published" ? "completed" : "draft"}`}>{r.status}</span> },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="db-actions">
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setView(r)}>Preview / Print</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal(r)}>Edit</button>
        <button type="button" className="kw-btn db-btn-sm" onClick={() => c.save(r.id, { status: r.status === "Published" ? "Draft" : "Published" })}>{r.status === "Published" ? "Unpublish" : "Publish"}</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => c.remove(r, r.title)}>Delete</button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Question Papers" sub="Build standard-wise and subject-wise papers from the Question Bank — auto (count + marks) or manual select.">
        <button type="button" className="kw-btn" onClick={() => setModal("new")} disabled={!c.rows || !qc.rows}>Create paper</button>
      </PageHeader>
      <Gate cs={[c, qc]} label="Loading papers…">
        <div className="db-toolbar">
          <select className="db-input" aria-label="Standard" value={std} onChange={(e) => setStd(e.target.value)}><option value="All">All standards</option>{STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="db-input" aria-label="Subject" value={sub} onChange={(e) => setSub(e.target.value)}><option value="All">All subjects</option>{QUESTION_SUBJECTS.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <DataTable columns={columns} rows={rows} pageSize={8} initialSort={{ key: "createdOn", dir: "desc" }} emptyText="No question papers yet." />
      </Gate>
      {modal && (
        <Modal title={modal === "new" ? "Create question paper" : "Edit question paper"} onClose={() => setModal(null)} wide>
          <PaperForm item={modal === "new" ? null : modal} questions={qc.rows} onCancel={() => setModal(null)}
            onSubmit={async (f) => { const { id, totalMarks, createdOn, ...body } = f; const res = await c.save(modal === "new" ? null : modal.id, { ...body, duration: Number(f.duration) }); if (res.ok) setModal(null); return res; }} />
        </Modal>
      )}
      {view && <PaperView paper={rows.find((r) => r.id === view.id) || view} questions={qc.rows} onClose={() => setView(null)} />}
    </>
  );
}
