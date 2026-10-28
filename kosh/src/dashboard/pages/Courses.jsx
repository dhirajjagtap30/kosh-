import { useEffect, useMemo, useState } from "react";
import { courseService, getErrorMessage } from "../../services";
import { useAuth } from "../../auth/AuthContext";
import { useCollection, useForm, Gate } from "../useCollection";
import { REG_STANDARDS, EXAM_TARGETS, LESSON_KINDS, LESSON_ICON, needsTarget, subjectsFor } from "../data";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

const EMPTY = { title: "", standard: "", target: "", subject: "", description: "", status: "Draft" };
const NEW_LESSON = { title: "", chapter: "", kind: "Video", url: "", minutes: "", when: "" };

/* Create / edit one course (the lessons are managed separately with the "Lessons" button). */
function CourseForm({ item, onSubmit, onCancel }) {
  const { f, setF, set, err, busy, submit } = useForm(item ? { ...EMPTY, ...item } : EMPTY, onSubmit, (v) => {
    if (!v.title.trim()) return "Enter the course title.";
    if (!v.standard) return "Select the standard.";
    if (!v.subject) return "Select the subject.";
    return "";
  });
  const subjects = subjectsFor(f.standard, f.target);
  const change = (k) => (e) => {
    const next = { ...f, [k]: e.target.value };
    if (k === "standard" && !needsTarget(next.standard)) next.target = "";
    if (!subjectsFor(next.standard, next.target).includes(next.subject)) next.subject = "";
    setF(next);
  };
  return (
    <form onSubmit={submit} noValidate>
      <label className="db-field">Course title<input className="db-input" value={f.title} onChange={set("title")} placeholder="e.g. NEET - Biology 12th" autoFocus /></label>
      <div className="db-row2">
        <label className="db-field">Standard<select className="db-input" value={f.standard} onChange={change("standard")}><option value="">Select</option>{REG_STANDARDS.map((x) => <option key={x}>{x}</option>)}</select></label>
        {needsTarget(f.standard)
          ? <label className="db-field">Exam target<select className="db-input" value={f.target} onChange={change("target")}><option value="">All streams (common)</option>{EXAM_TARGETS.map((x) => <option key={x}>{x}</option>)}</select></label>
          : <label className="db-field">Exam target<input className="db-input" value="Not needed (school class)" disabled /></label>}
      </div>
      <div className="db-row2">
        <label className="db-field">Subject<select className="db-input" value={f.subject} onChange={set("subject")}><option value="">Select</option>{subjects.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="db-field">Status<select className="db-input" value={f.status} onChange={set("status")}><option>Draft</option><option>Published</option></select></label>
      </div>
      <label className="db-field">Description (optional)<textarea className="db-input" rows={2} value={f.description || ""} onChange={set("description")} /></label>
      <p className="db-muted">Published courses are visible only to students of the same standard{needsTarget(f.standard) ? " and exam target" : ""}. Draft = hidden.</p>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : item ? "Save changes" : "Create course"}</button>
      </div>
    </form>
  );
}

/* Add / edit / re-order / remove the lessons of one course, then save them together. */
function LessonsEditor({ course, onSave, onCancel }) {
  const [list, setList] = useState(course.lessons || []);
  const [draft, setDraft] = useState(NEW_LESSON);
  const [editAt, setEditAt] = useState(-1);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const setD = (k) => (e) => { setDraft((d) => ({ ...d, [k]: e.target.value })); setErr(""); };

  const addOrUpdate = () => {
    if (!draft.title.trim()) return setErr("Enter the lesson title.");
    if (["Video", "Notes"].includes(draft.kind) && draft.url.trim() && !/^https?:\/\/\S+\.\S+/i.test(draft.url.trim())) return setErr("The link must start with http:// or https://");
    const l = { ...draft, title: draft.title.trim(), minutes: Number(draft.minutes) || 0 };
    setList((cur) => (editAt >= 0 ? cur.map((x, i) => (i === editAt ? { ...x, ...l } : x)) : [...cur, l]));
    setDraft(NEW_LESSON); setEditAt(-1); setErr("");
  };
  const move = (i, d) => setList((cur) => { const n = [...cur]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const save = async () => { setBusy(true); const res = await onSave(list); setBusy(false); if (res && !res.ok) setErr(res.error); };

  return (
    <div>
      <p className="db-muted" style={{ marginTop: 0 }}>{course.title} · {course.standard}{course.target ? ` · ${course.target}` : ""} · {course.subject}</p>
      <div style={{ display: "grid", gap: 8, margin: "10px 0" }}>
        {!list.length && <p className="db-muted">No lessons yet. Add the first lesson below.</p>}
        {list.map((l, i) => (
          <div key={i} style={{ border: "1px solid #e4e9f2", borderRadius: 12, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ minWidth: 0, flex: 1 }}>
              <b>{LESSON_ICON[l.kind]} {i + 1}. {l.title}</b>
              <small className="db-muted" style={{ display: "block" }}>{l.chapter || "No chapter"} · {l.kind}{l.minutes ? ` · ${l.minutes} min` : ""}{l.when ? ` · ${l.when}` : ""}{l.url ? " · link added" : ""}</small>
            </span>
            <span className="db-actions">
              <button type="button" className="kw-btn db-btn-sm db-btn-line" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="kw-btn db-btn-sm db-btn-line" aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => { setDraft({ ...NEW_LESSON, ...l, minutes: l.minutes || "" }); setEditAt(i); }}>Edit</button>
              <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => { setList((cur) => cur.filter((_, j) => j !== i)); if (editAt === i) { setDraft(NEW_LESSON); setEditAt(-1); } }}>Remove</button>
            </span>
          </div>
        ))}
      </div>
      <div style={{ border: "1px dashed #b6c4e0", borderRadius: 12, padding: 12 }}>
        <b>{editAt >= 0 ? `Edit lesson ${editAt + 1}` : "Add a lesson"}</b>
        <label className="db-field">Lesson title<input className="db-input" value={draft.title} onChange={setD("title")} placeholder="e.g. Newton's laws - full lecture" /></label>
        <div className="db-row2">
          <label className="db-field">Chapter / unit<input className="db-input" value={draft.chapter} onChange={setD("chapter")} placeholder="e.g. Laws of Motion" /></label>
          <label className="db-field">Type<select className="db-input" value={draft.kind} onChange={setD("kind")}>{LESSON_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
        </div>
        {["Video", "Notes", "Live class"].includes(draft.kind) && <label className="db-field">{draft.kind === "Live class" ? "Meeting link (Zoom / Meet)" : draft.kind === "Notes" ? "Notes link (PDF / Drive)" : "Video link (YouTube / Drive)"}<input className="db-input" type="url" value={draft.url} onChange={setD("url")} placeholder="https://…" /></label>}
        <div className="db-row2">
          <label className="db-field">Duration (minutes)<input className="db-input" inputMode="numeric" value={draft.minutes} onChange={setD("minutes")} /></label>
          {draft.kind === "Live class" && <label className="db-field">Schedule<input className="db-input" value={draft.when} onChange={setD("when")} placeholder="e.g. Sat 5:00 PM" /></label>}
        </div>
        <div className="db-actions">
          <button type="button" className="kw-btn db-btn-sm" onClick={addOrUpdate}>{editAt >= 0 ? "Update lesson" : "+ Add lesson"}</button>
          {editAt >= 0 && <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => { setDraft(NEW_LESSON); setEditAt(-1); }}>Cancel edit</button>}
        </div>
      </div>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Close</button>
        <button type="button" className="kw-btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save lessons"}</button>
      </div>
    </div>
  );
}

/* How far each eligible student has come in the course. */
function Progress({ course }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { courseService.progress(course.id).then(setRows).catch((e) => setErr(getErrorMessage(e))); }, [course.id]);
  if (err) return <p className="db-err" role="alert">{err}</p>;
  if (!rows) return <p className="db-muted">Loading…</p>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {!rows.length && <p className="db-muted">No active student is registered for this standard{course.target ? ` and ${course.target}` : ""} yet.</p>}
      {rows.map((r) => (
        <div key={r.studentId}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span><b>{r.name}</b> <small className="db-muted">{r.target || r.standard}</small></span><b>{r.done}/{r.total} · {r.percent}%</b></div>
          <div style={{ height: 8, background: "#e6eaf2", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${r.percent}%`, height: "100%", background: "#2563eb" }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function Courses() {
  const c = useCollection(courseService);
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [std, setStd] = useState("All");
  const [tg, setTg] = useState("All");
  const [st, setSt] = useState("All");
  const [modal, setModal] = useState(null); // { type: "form" | "lessons" | "progress", row? }

  const rows = useMemo(() => (c.rows || [])
    .filter((r) => `${r.title} ${r.subject}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((r) => std === "All" || r.standard === std)
    .filter((r) => tg === "All" || (tg === "None" ? !r.target : r.target === tg))
    .filter((r) => st === "All" || r.status === st), [c.rows, q, std, tg, st]);

  const columns = [
    { key: "title", label: "Course", sortable: true, render: (r) => <><b>{r.title}</b><p className="db-muted" style={{ margin: "2px 0 0", fontSize: 13 }}>{r.subject}</p></> },
    ...(user && user.role === "superadmin" ? [{ key: "branchName", label: "Branch", sortable: true }] : []),
    { key: "standard", label: "Std", sortable: true },
    { key: "target", label: "Exam target", sortable: true, render: (r) => r.target || "School / common" },
    { key: "lessonCount", label: "Lessons", sortable: true },
    { key: "learnerCount", label: "Students", sortable: true },
    { key: "avgProgress", label: "Avg progress", sortable: true, render: (r) => `${r.avgProgress}%` },
    { key: "status", label: "Status", sortable: true, render: (r) => <span className={`db-badge-s ${r.status === "Published" ? "completed" : "draft"}`}>{r.status}</span> },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="db-actions">
        <button type="button" className="kw-btn db-btn-sm" onClick={() => setModal({ type: "lessons", row: r })}>Lessons</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal({ type: "progress", row: r })}>Progress</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal({ type: "form", row: r })}>Edit</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => c.save(r.id, { status: r.status === "Published" ? "Draft" : "Published" })}>{r.status === "Published" ? "Unpublish" : "Publish"}</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => c.remove(r, `"${r.title}"`)}>Delete</button>
      </div>
    ) },
  ];
  const cur = modal && modal.row && (c.rows || []).find((x) => x.id === modal.row.id);

  return (
    <>
      <PageHeader title="LMS Courses" sub="Courses for 5th-10th and for 11th / 12th (JEE Main, JEE Advanced, NEET, MHT-CET). Students see only the courses of their own standard and exam target.">
        <button type="button" className="kw-btn" onClick={() => setModal({ type: "form" })} disabled={!c.rows}>Create course</button>
      </PageHeader>
      <Gate cs={c} label="Loading courses…">
        <div className="db-toolbar">
          <input className="db-input grow" type="search" placeholder="Search course or subject" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="db-input" aria-label="Standard" value={std} onChange={(e) => setStd(e.target.value)}><option value="All">All standards</option>{REG_STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="db-input" aria-label="Exam target" value={tg} onChange={(e) => setTg(e.target.value)}><option value="All">All targets</option>{EXAM_TARGETS.map((x) => <option key={x}>{x}</option>)}<option value="None">School / common</option></select>
          <select className="db-input" aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)}><option value="All">All status</option><option>Published</option><option>Draft</option></select>
        </div>
        <DataTable columns={columns} rows={rows} pageSize={8} initialSort={{ key: "standard", dir: "asc" }} emptyText="No courses match your filters." />
      </Gate>
      {modal && modal.type === "form" && (
        <Modal title={modal.row ? "Edit course" : "Create course"} onClose={() => setModal(null)}>
          <CourseForm item={cur || null} onCancel={() => setModal(null)}
            onSubmit={async (f) => { const body = { title: f.title.trim(), standard: f.standard, target: f.target || "", subject: f.subject, description: (f.description || "").trim(), status: f.status }; const res = await c.save(modal.row ? modal.row.id : null, body); if (res.ok) setModal(res.item && !modal.row ? { type: "lessons", row: res.item } : null); return res; }} />
        </Modal>
      )}
      {modal && modal.type === "lessons" && (cur || modal.row) && (
        <Modal title="Lessons" wide onClose={() => setModal(null)}>
          <LessonsEditor course={cur || modal.row} onCancel={() => setModal(null)} onSave={async (lessons) => { const res = await c.save(modal.row.id, { lessons }); if (res.ok) setModal(null); return res; }} />
        </Modal>
      )}
      {modal && modal.type === "progress" && <Modal title={`Progress - ${modal.row.title}`} onClose={() => setModal(null)}><Progress course={modal.row} /></Modal>}
    </>
  );
}
