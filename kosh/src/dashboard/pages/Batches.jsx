import { useMemo, useState } from "react";
import { batchService, registrationService } from "../../services";
import { useCollection, useForm, Gate } from "../useCollection";
import { STANDARDS } from "../data";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import "./teacher.css";

/* Add / remove students of an existing batch. Every click is saved at once. */
function ManageStudents({ batch, students, onSave, onClose }) {
  const [ids, setIds] = useState(batch.studentIds || []);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const pool = useMemo(() => students.filter((s) => s.standard === batch.standard && s.status !== "Inactive"), [students, batch.standard]);
  const inB = pool.filter((s) => ids.includes(s.id));
  const out = pool.filter((s) => !ids.includes(s.id) && `${s.name} ${s.mobile}`.toLowerCase().includes(q.trim().toLowerCase()));
  const change = async (next) => {
    if (busy) return;
    setBusy(true); setErr("");
    const res = await onSave(next);
    setBusy(false);
    if (res.ok) setIds(next); else setErr(res.error);
  };
  return (
    <Modal title={`Students — ${batch.name} (${batch.standard})`} onClose={onClose}>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="tm-cols">
        <div>
          <div className="db-pick-head"><b>In this batch ({inB.length})</b>{inB.length > 0 && <button type="button" className="db-link-btn" disabled={busy} onClick={() => window.confirm("Remove all students from this batch?") && change([])}>Remove all</button>}</div>
          <div className="tm-box">{!inB.length ? <p className="db-muted">No students yet. Add from the right.</p> : inB.map((s) => (
            <div key={s.id} className="tm-row"><span>{s.name}<br /><small>{s.mobile}</small></span><button type="button" className="kw-btn db-btn-sm db-btn-danger" disabled={busy} onClick={() => change(ids.filter((x) => x !== s.id))}>Remove</button></div>))}</div>
        </div>
        <div>
          <div className="db-pick-head"><b>Add students</b>{out.length > 0 && <button type="button" className="db-link-btn" disabled={busy} onClick={() => change([...new Set([...ids, ...out.map((s) => s.id)])])}>Add all shown</button>}</div>
          <input className="db-input" type="search" placeholder="Search name / mobile" aria-label="Search students" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
          <div className="tm-box">{!out.length ? <p className="db-muted">{pool.length === ids.length ? `Every registered ${batch.standard} student is already in this batch.` : "No student matches."}</p> : out.map((s) => (
            <div key={s.id} className="tm-row"><span>{s.name}<br /><small>{s.mobile}</small></span><button type="button" className="kw-btn db-btn-sm" disabled={busy} onClick={() => change([...ids, s.id])}>Add</button></div>))}</div>
        </div>
      </div>
      <div className="db-modal-foot"><button type="button" className="kw-btn" onClick={onClose}>Done</button></div>
    </Modal>
  );
}

function BatchForm({ item, students, onSubmit, onCancel }) {
  const { f, setF, set, err, busy, submit } = useForm(
    item ? { ...item } : { name: "", standard: "", studentIds: [] },
    onSubmit,
    (v) => {
      if (!v.name.trim()) return "Enter the batch name.";
      if (!v.standard) return "Select the standard.";
      return "";
    }
  );
  const pool = useMemo(() => students.filter((s) => s.standard === f.standard && s.status !== "Inactive"), [students, f.standard]);
  const toggle = (id) => setF((p) => ({ ...p, studentIds: p.studentIds.includes(id) ? p.studentIds.filter((x) => x !== id) : [...p.studentIds, id] }));
  const all = pool.length > 0 && pool.every((s) => f.studentIds.includes(s.id));
  return (
    <form onSubmit={submit} noValidate>
      <div className="db-row2">
        <label className="db-field">Batch name<input className="db-input" value={f.name} onChange={set("name")} placeholder="e.g. 10th - Morning" autoFocus /></label>
        <label className="db-field">Standard
          <select className="db-input" value={f.standard} onChange={(e) => setF((p) => ({ ...p, standard: e.target.value, studentIds: [] }))}><option value="">Select</option>{STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
      </div>
      <div className="db-pick-head">
        <b>Students ({f.studentIds.length} selected)</b>
        {pool.length > 0 && <button type="button" className="db-link-btn" onClick={() => setF((p) => ({ ...p, studentIds: all ? [] : pool.map((s) => s.id) }))}>{all ? "Clear all" : "Select all"}</button>}
      </div>
      <div className="db-batch-list">
        {!f.standard ? <p className="db-muted">Choose the standard to see its registered students.</p>
          : !pool.length ? <p className="db-muted">No active registered students in {f.standard}. Add them under Registrations first.</p>
          : pool.map((s) => (
            <label key={s.id} className="db-pick-row">
              <input type="checkbox" checked={f.studentIds.includes(s.id)} onChange={() => toggle(s.id)} />
              <span>{s.name}<small className="db-muted"> — {s.mobile}</small></span>
            </label>
          ))}
      </div>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : "Save batch"}</button>
      </div>
    </form>
  );
}

export default function Batches() {
  const c = useCollection(batchService);
  const sc = useCollection(registrationService);
  const [std, setStd] = useState("All");
  const [modal, setModal] = useState(null);
  const [manage, setManage] = useState(null); // batch id
  const rows = (c.rows || []).filter((r) => std === "All" || r.standard === std);
  const columns = [
    { key: "name", label: "Batch", sortable: true, render: (r) => <b>{r.name}</b> },
    { key: "standard", label: "Std", sortable: true },
    { key: "studentCount", label: "Students", sortable: true, render: (r) => (r.studentIds || []).length },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="db-actions">
        <button type="button" className="kw-btn db-btn-sm" onClick={() => setManage(r.id)}>Add / remove students</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal(r)}>Edit</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => c.remove(r, `batch "${r.name}"`)}>Delete</button>
      </div>
    ) },
  ];
  return (
    <>
      <PageHeader title="Batches" sub="Create batches, add or remove students any time, then assign tests, notes and notifications to a batch.">
        <button type="button" className="kw-btn" onClick={() => setModal("new")} disabled={!c.rows || !sc.rows}>Create batch</button>
      </PageHeader>
      <Gate cs={[c, sc]} label="Loading batches…">
        <div className="db-toolbar">
          <select className="db-input" aria-label="Standard" value={std} onChange={(e) => setStd(e.target.value)}><option value="All">All standards</option>{STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <DataTable columns={columns} rows={rows} pageSize={8} initialSort={{ key: "standard", dir: "asc" }} emptyText="No batches yet. Create one to assign tests to a group of students." />
      </Gate>
      {manage && (c.rows || []).find((b) => b.id === manage) && (() => { const b = c.rows.find((x) => x.id === manage); return (
        <ManageStudents batch={b} students={sc.rows || []} onClose={() => setManage(null)}
          onSave={(studentIds) => c.save(b.id, { name: b.name, standard: b.standard, studentIds })} />); })()}
      {modal && (
        <Modal title={modal === "new" ? "Create batch" : "Edit batch"} onClose={() => setModal(null)}>
          <BatchForm item={modal === "new" ? null : modal} students={sc.rows} onCancel={() => setModal(null)}
            onSubmit={async (f) => { const res = await c.save(modal === "new" ? null : modal.id, { name: f.name.trim(), standard: f.standard, studentIds: f.studentIds }); if (res.ok) setModal(null); return res; }} />
        </Modal>
      )}
    </>
  );
}
