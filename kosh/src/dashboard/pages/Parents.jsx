import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { parentService, registrationService } from "../../services";
import { useCollection, useForm, Gate } from "../useCollection";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

function ParentForm({ item, students, onSubmit, onCancel }) {
  const editing = Boolean(item);
  const { f, set, err, busy, submit } = useForm(item ? { ...item, password: "" } : { name: "", mobile: "", email: "", studentId: "", username: "", password: "" }, onSubmit, (v) => {
    if (!v.name.trim()) return "Enter the parent name.";
    if (v.mobile && !/^\d{10}$/.test(v.mobile)) return "Mobile number must be 10 digits.";
    if (!v.studentId) return "Choose the student (child).";
    if (v.username.trim().length < 3 || /\s/.test(v.username.trim())) return "Login ID must be at least 3 characters, without spaces.";
    if ((!editing || v.password) && v.password.length < 6) return "Password must be at least 6 characters.";
    return "";
  });
  return (
    <form onSubmit={submit} noValidate>
      <label className="db-field">Parent name<input className="db-input" value={f.name} onChange={set("name")} autoFocus /></label>
      <label className="db-field">Child (registered student)
        <select className="db-input" value={f.studentId} onChange={set("studentId")}>
          <option value="">Select student</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.standard}</option>)}
        </select>
      </label>
      <div className="db-row2">
        <label className="db-field">Mobile (optional)<input className="db-input" inputMode="numeric" maxLength={10} value={f.mobile} onChange={set("mobile")} /></label>
        <label className="db-field">Email (optional)<input className="db-input" type="email" value={f.email} onChange={set("email")} /></label>
      </div>
      <div className="db-row2">
        <label className="db-field">Login ID<input className="db-input" autoCapitalize="none" value={f.username} onChange={set("username")} /></label>
        <label className="db-field">{editing ? "New password (blank = keep)" : "Password"}<input className="db-input" autoComplete="off" value={f.password} onChange={set("password")} /></label>
      </div>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

export default function Parents() {
  const { user } = useAuth();
  const c = useCollection(parentService);
  const s = useCollection(registrationService);
  const [modal, setModal] = useState(null);
  if (user && !["admin", "superadmin"].includes(user.role)) return <Navigate to="/dashboard" replace />; // admin-only page

  const child = (id) => (s.rows || []).find((x) => x.id === id);
  const columns = [
    { key: "name", label: "Parent", sortable: true, render: (r) => <b>{r.name}</b> },
    { key: "studentId", label: "Child", render: (r) => { const x = child(r.studentId); return x ? `${x.name} (${x.standard})` : "—"; } },
    { key: "username", label: "Login ID", sortable: true },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="db-actions">
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal(r)}>Edit</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => c.remove(r, r.name)}>Delete</button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Parents" sub="Create parent logins and link each one to a registered student.">
        <button type="button" className="kw-btn" onClick={() => setModal("new")} disabled={!c.rows || !s.rows}>Add parent</button>
      </PageHeader>
      <Gate cs={[c, s]} label="Loading parents…">
        <DataTable columns={columns} rows={c.rows} pageSize={8} emptyText="No parent accounts yet." />
      </Gate>
      {modal && (
        <Modal title={modal === "new" ? "Add parent" : "Edit parent"} onClose={() => setModal(null)}>
          <ParentForm item={modal === "new" ? null : modal} students={s.rows} onCancel={() => setModal(null)}
            onSubmit={async (f) => { const { id, ...body } = f; const res = await c.save(modal === "new" ? null : modal.id, { ...body, studentId: Number(f.studentId) }); if (res.ok) setModal(null); return res; }} />
        </Modal>
      )}
    </>
  );
}
