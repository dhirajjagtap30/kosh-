import { useState } from "react";
import { noticeService } from "../../services";
import { useCollection, useForm, Gate } from "../useCollection";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";

const STANDARDS = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "Dropper / Repeater"];
const when = (d) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function NoticeForm({ item, onSubmit, onCancel }) {
  const { f, setF, set, err, busy, submit } = useForm(item ? { ...item } : { title: "", text: "", audience: "Parents", standard: "", pinned: false }, onSubmit, (v) => {
    if (!v.title.trim()) return "Enter the notice title.";
    if (!v.text.trim()) return "Write the notice.";
    return "";
  });
  return (
    <form onSubmit={submit} noValidate>
      <label className="db-field">Title<input className="db-input" maxLength={120} value={f.title} onChange={set("title")} autoFocus placeholder="e.g. Parent-Teacher Meeting" /></label>
      <label className="db-field">Notice<textarea className="db-input" rows={5} maxLength={2000} value={f.text} onChange={set("text")} /></label>
      <div className="db-row2">
        <label className="db-field">Show to
          <select className="db-input" value={f.audience} onChange={set("audience")}>
            <option value="Parents">Parents</option><option value="Everyone">Everyone</option><option value="Students">Students only</option>
          </select>
        </label>
        <label className="db-field">Standard
          <select className="db-input" value={f.standard} onChange={set("standard")}>
            <option value="">All standards</option>{STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0 12px" }}>
        <input type="checkbox" checked={Boolean(f.pinned)} onChange={(e) => setF((p) => ({ ...p, pinned: e.target.checked }))} /> 📌 Pin on top
      </label>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : "Publish notice"}</button>
      </div>
    </form>
  );
}

/* Dashboard -> Notices: announcements that parents read under Parent Dashboard -> View Notices. */
export default function Notices() {
  const c = useCollection(noticeService);
  const [modal, setModal] = useState(null);
  const rows = [...(c.rows || [])].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || String(b.createdOn).localeCompare(String(a.createdOn)));

  return (
    <>
      <PageHeader title="Notices" sub="Write announcements for parents. They see them in Parent Dashboard → View Notices.">
        <button type="button" className="kw-btn" onClick={() => setModal("new")} disabled={!c.rows}>New notice</button>
      </PageHeader>
      <Gate cs={c} label="Loading notices…">
        <div style={{ display: "grid", gap: 14 }}>
          {!rows.length && <div style={{ textAlign: "center", padding: 30, background: "#fff", border: "1px solid #e4e9f2", borderRadius: 14 }}>No notices yet. Click “New notice”.</div>}
          {rows.map((n) => (
            <div key={n.id} style={{ padding: 16, background: "#fff", border: "1px solid #e4e9f2", borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <b>{n.pinned ? "📌 " : ""}{n.title}</b>
                <small className="db-muted">{n.audience} · {n.standard || "All standards"} · {when(n.createdOn)}</small>
              </div>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{n.text}</p>
              <div className="db-actions">
                <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal(n)}>Edit</button>
                <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => c.remove(n, "this notice")}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Gate>
      {modal && (
        <Modal title={modal === "new" ? "New notice" : "Edit notice"} onClose={() => setModal(null)}>
          <NoticeForm item={modal === "new" ? null : modal} onCancel={() => setModal(null)}
            onSubmit={async (f) => { const { id, createdOn, branchId, branchName, ...body } = f; const res = await c.save(modal === "new" ? null : modal.id, body); if (res.ok) setModal(null); return res; }} />
        </Modal>
      )}
    </>
  );
}
