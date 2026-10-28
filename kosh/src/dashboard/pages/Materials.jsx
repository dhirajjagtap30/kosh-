import { useMemo, useState } from "react";
import { materialService, batchService } from "../../services";
import { env } from "../../config/env";
import { useCollection, useForm, Gate } from "../useCollection";
import { STANDARDS, QUESTION_SUBJECTS } from "../data";
import { fmtDate } from "../utils";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

const MAX_BYTES = env.USE_MOCK ? 1_000_000 : 20_000_000; // demo mode keeps the file in browser storage, so it must be small
const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg";
const mb = (n) => `${Math.round((n / 1_000_000) * 10) / 10} MB`;

function MaterialForm({ item, defaults, batches, onSubmit, onCancel }) {
  const { f, setF, set, err, busy, submit } = useForm(
    item ? { ...item, file: null, batchIds: item.batchIds || [] } : { kind: defaults.kind, title: "", standard: defaults.standard, subject: defaults.subject, description: "", url: "", file: null, batchIds: [] },
    onSubmit,
    (v) => {
      if (!v.title.trim()) return "Enter a title.";
      if (!v.standard || !v.subject) return "Select standard and subject.";
      if (v.kind === "Video" && !/^https?:\/\/\S+\.\S+/i.test(v.url.trim())) return "Enter a valid video link starting with http:// or https://";
      if (v.kind === "Note" && !v.file && !(item && item.fileName)) return "Choose the notes file to upload.";
      return "";
    }
  );
  const [fileErr, setFileErr] = useState("");
  const pickFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file && file.size > MAX_BYTES) { setFileErr(`File is ${mb(file.size)} — maximum allowed is ${mb(MAX_BYTES)}.`); e.target.value = ""; setF((p) => ({ ...p, file: null })); return; }
    setFileErr("");
    setF((p) => ({ ...p, file: file || null }));
  };
  return (
    <form onSubmit={submit} noValidate>
      {!item && (
        <div className="db-seg" role="radiogroup" aria-label="Material type">
          {[["Note", "📄 Notes (upload file)"], ["Video", "🎬 Video link"]].map(([k, l]) => (
            <button type="button" key={k} role="radio" aria-checked={f.kind === k} className={f.kind === k ? "on" : ""} onClick={() => setF((p) => ({ ...p, kind: k }))}>{l}</button>
          ))}
        </div>
      )}
      <label className="db-field">Title<input className="db-input" value={f.title} onChange={set("title")} placeholder={f.kind === "Video" ? "e.g. Quadratic equations - full lecture" : "e.g. Chapter 3 notes"} autoFocus /></label>
      <div className="db-row2">
        <label className="db-field">Standard<select className="db-input" value={f.standard} onChange={set("standard")}><option value="">Select</option>{STANDARDS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="db-field">Subject<select className="db-input" value={f.subject} onChange={set("subject")}><option value="">Select</option>{QUESTION_SUBJECTS.map((x) => <option key={x}>{x}</option>)}</select></label>
      </div>
      {f.kind === "Video" ? (
        <label className="db-field">Video link (YouTube, Google Drive, etc.)<input className="db-input" type="url" value={f.url || ""} onChange={set("url")} placeholder="https://www.youtube.com/watch?v=…" /></label>
      ) : (
        <label className="db-field">Notes file (PDF, Word, PowerPoint, Excel, image — max {mb(MAX_BYTES)})
          <input className="db-input" type="file" accept={ACCEPT} onChange={pickFile} />
          {item && item.fileName && !f.file && <small className="db-muted">Current file: {item.fileName} (choose a new file only to replace it)</small>}
          {f.file && <small className="db-muted">Selected: {f.file.name} ({mb(f.file.size)})</small>}
          {fileErr && <small className="db-err" role="alert">{fileErr}</small>}
        </label>
      )}
      {(() => { const list = (batches || []).filter((b) => b.standard === f.standard); const on = f.batchIds || []; return f.standard ? (
        <div className="db-field">Send to
          {!list.length ? <small className="db-muted">All students of {f.standard}. (Create a batch to send only to a batch.)</small> : (<>
            <div className="db-batch-list">{list.map((b) => (
              <label key={b.id} className="db-pick-row"><input type="checkbox" checked={on.includes(b.id)} onChange={() => setF((p) => ({ ...p, batchIds: on.includes(b.id) ? on.filter((x) => x !== b.id) : [...on, b.id] }))} /><span>{b.name}<small className="db-muted"> — {(b.studentIds || []).length} students</small></span></label>))}</div>
            <small className="db-muted">{on.length ? `Only the ${on.length} selected batch${on.length > 1 ? "es" : ""} will see this.` : `Nothing selected = all students of ${f.standard}.`}</small></>)}
        </div>) : null; })()}
      <label className="db-field">Description (optional)<textarea className="db-input" rows={2} value={f.description || ""} onChange={set("description")} /></label>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? (f.file ? "Uploading…" : "Saving…") : item ? "Save changes" : f.kind === "Video" ? "Add video" : "Upload notes"}</button>
      </div>
    </form>
  );
}

export default function Materials() {
  const c = useCollection(materialService);
  const bc = useCollection(batchService);
  const [q, setQ] = useState("");
  const [std, setStd] = useState("All");
  const [sub, setSub] = useState("All");
  const [kind, setKind] = useState("All");
  const [modal, setModal] = useState(null); // "Note" | "Video" (new) | row (edit)

  const rows = useMemo(() => (c.rows || [])
    .filter((r) => `${r.title} ${r.description || ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((r) => std === "All" || r.standard === std)
    .filter((r) => sub === "All" || r.subject === sub)
    .filter((r) => kind === "All" || r.kind === kind), [c.rows, q, std, sub, kind]);

  const columns = [
    { key: "kind", label: "Type", sortable: true, render: (r) => <span className={`db-badge-s ${r.kind === "Video" ? "scheduled" : "completed"}`}>{r.kind === "Video" ? "🎬 Video" : "📄 Notes"}</span> },
    { key: "title", label: "Title", sortable: true, render: (r) => <><b>{r.title}</b>{r.description ? <p className="db-muted" style={{ margin: "2px 0 0", fontSize: 13 }}>{r.description}</p> : null}</> },
    { key: "standard", label: "Std", sortable: true },
    { key: "subject", label: "Subject", sortable: true },
    { key: "batchIds", label: "Sent to", render: (r) => ((r.batchIds || []).length ? (r.batchIds.map((id) => ((bc.rows || []).find((b) => b.id === id) || {}).name).filter(Boolean).join(", ") || "Batches") : `All ${r.standard}`) },
    { key: "createdOn", label: "Added", sortable: true, render: (r) => (r.createdOn ? fmtDate(r.createdOn) : "—") },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="db-actions">
        {r.kind === "Video"
          ? <a className="kw-btn db-btn-sm db-btn-line" href={r.url} target="_blank" rel="noopener noreferrer">Open link</a>
          : <a className="kw-btn db-btn-sm db-btn-line" href={r.fileUrl} download={r.fileName || true} target="_blank" rel="noopener noreferrer">Download</a>}
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal(r)}>Edit</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => c.remove(r, `"${r.title}"`)}>Delete</button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Study Material" sub="Upload notes and video links by standard and subject, and send them to a whole standard or only selected batches.">
        <button type="button" className="kw-btn db-btn-line" onClick={() => setModal("Video")} disabled={!c.rows}>Add video link</button>
        <button type="button" className="kw-btn" onClick={() => setModal("Note")} disabled={!c.rows}>Upload notes</button>
      </PageHeader>
      <Gate cs={c} label="Loading study material…">
        <div className="db-toolbar">
          <input className="db-input grow" type="search" placeholder="Search title" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="db-input" aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)}><option value="All">Notes + Videos</option><option value="Note">Notes</option><option value="Video">Videos</option></select>
          <select className="db-input" aria-label="Standard" value={std} onChange={(e) => setStd(e.target.value)}><option value="All">All standards</option>{STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="db-input" aria-label="Subject" value={sub} onChange={(e) => setSub(e.target.value)}><option value="All">All subjects</option>{QUESTION_SUBJECTS.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <DataTable columns={columns} rows={rows} pageSize={8} initialSort={{ key: "createdOn", dir: "desc" }} emptyText="No study material yet. Upload notes or add a video link." />
      </Gate>
      {modal && (
        <Modal title={typeof modal === "string" ? (modal === "Video" ? "Add video link" : "Upload notes") : "Edit study material"} onClose={() => setModal(null)}>
          <MaterialForm item={typeof modal === "string" ? null : modal} batches={bc.rows || []} defaults={{ kind: typeof modal === "string" ? modal : "Note", standard: std === "All" ? "" : std, subject: sub === "All" ? "" : sub }} onCancel={() => setModal(null)}
            onSubmit={async (f) => {
              const body = { title: f.title.trim(), standard: f.standard, subject: f.subject, kind: f.kind, description: (f.description || "").trim(), url: f.kind === "Video" ? f.url.trim() : "", file: f.kind === "Note" ? f.file : null, batchIds: f.batchIds || [] };
              const res = await c.save(typeof modal === "string" ? null : modal.id, body);
              if (res.ok) setModal(null);
              return res;
            }} />
        </Modal>
      )}
    </>
  );
}
