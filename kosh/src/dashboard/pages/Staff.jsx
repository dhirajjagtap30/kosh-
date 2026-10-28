import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { staffService, getErrorMessage } from "../../services";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { LoadingState, ErrorState, ErrorBanner } from "../../components/StatusViews";

const ROLES = [["staff", "Staff"], ["trainer", "Trainer"], ["admin", "Branch Admin"]];
const label = (r) => (ROLES.find(([v]) => v === r) || [, r])[1];

function StaffForm({ item, onSubmit, onCancel }) {
  const editing = Boolean(item);
  const [f, setF] = useState(item ? { name: item.name, role: item.role, mobile: item.mobile, email: item.email, username: item.username, password: "" } : { name: "", role: "trainer", mobile: "", email: "", username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr(""); };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!f.name.trim()) return setErr("Enter the name.");
    if (f.mobile && !/^\d{10}$/.test(f.mobile)) return setErr("Mobile number must be 10 digits.");
    if (f.username.trim().length < 3 || /\s/.test(f.username.trim())) return setErr("ID must be at least 3 characters, without spaces.");
    if ((!editing || f.password) && f.password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    const res = await onSubmit({ ...f, name: f.name.trim(), username: f.username.trim(), email: f.email.trim() });
    setBusy(false);
    if (res && !res.ok) setErr(res.error);
  };

  return (
    <form onSubmit={submit} noValidate>
      <label className="db-field">Full name
        <input className="db-input" value={f.name} onChange={set("name")} autoFocus />
      </label>
      <div className="db-row2">
        <label className="db-field">Role
          <select className="db-input" value={f.role} onChange={set("role")}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="db-field">Mobile (optional)
          <input className="db-input" inputMode="numeric" maxLength={10} value={f.mobile} onChange={set("mobile")} />
        </label>
      </div>
      <label className="db-field">Email (optional)
        <input className="db-input" type="email" value={f.email} onChange={set("email")} />
      </label>
      <div className="db-row2">
        <label className="db-field">Login ID
          <input className="db-input" autoCapitalize="none" spellCheck="false" value={f.username} onChange={set("username")} />
        </label>
        <label className="db-field">{editing ? "New password (blank = keep)" : "Password"}
          <input className="db-input" type="text" autoComplete="off" value={f.password} onChange={set("password")} />
        </label>
      </div>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create account"}</button>
      </div>
    </form>
  );
}

export default function Staff() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [created, setCreated] = useState(null); // credentials shown once after creation
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoadErr("");
    try { setRows(await staffService.list()); } catch (e) { setLoadErr(getErrorMessage(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (user && !["admin", "superadmin"].includes(user.role)) return <Navigate to="/dashboard" replace />; // admin-only page

  const create = async (f) => {
    try {
      const s = await staffService.create(f);
      setRows((r) => [...(r || []), s]);
      setAdding(false);
      setCreated({ name: s.name, role: s.role, username: s.username, password: f.password });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: getErrorMessage(e) };
    }
  };

  const update = async (f) => {
    try {
      const body = { name: f.name, role: f.role, mobile: f.mobile, email: f.email, username: f.username };
      if (f.password) body.password = f.password;
      const s = await staffService.update(editing.id, body);
      setRows((r) => r.map((x) => (x.id === s.id ? s : x)));
      setEditing(null);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: getErrorMessage(e) };
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.name}?`)) return;
    setActionErr("");
    try {
      await staffService.remove(s.id);
      setRows((r) => r.filter((x) => x.id !== s.id));
    } catch (e) {
      setActionErr(getErrorMessage(e));
    }
  };

  const copy = async () => {
    const text = `ID: ${created.username}\nPassword: ${created.password}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard unavailable */ }
  };

  const columns = [
    { key: "name", label: "Name", sortable: true, render: (r) => <b>{r.name}</b> },
    { key: "role", label: "Role", sortable: true, render: (r) => label(r.role) },
    { key: "username", label: "Login ID", sortable: true },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="db-actions"><button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setEditing(r)}>Edit</button><button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => remove(r)}>Remove</button></div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Staff & Trainers" sub="Create staff and trainer accounts. You choose their login ID and password.">
        <button type="button" className="kw-btn" onClick={() => setAdding(true)} disabled={!rows}>Add staff / trainer</button>
      </PageHeader>

      <ErrorBanner message={actionErr} onClose={() => setActionErr("")} />
      {loadErr ? <ErrorState message={loadErr} onRetry={load} />
        : !rows ? <LoadingState label="Loading staff…" />
        : <DataTable columns={columns} rows={rows} pageSize={8} emptyText="No staff or trainers added yet." />}

      {adding && (
        <Modal title="Add staff / trainer" onClose={() => setAdding(false)}>
          <StaffForm onCancel={() => setAdding(false)} onSubmit={create} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit staff / trainer" onClose={() => setEditing(null)}>
          <StaffForm item={editing} onCancel={() => setEditing(null)} onSubmit={update} />
        </Modal>
      )}

      {created && (
        <Modal title="Account created" onClose={() => { setCreated(null); setCopied(false); }}>
          <p className="db-muted" style={{ marginTop: 0 }}>Share these login details with {created.name} ({label(created.role)}). For security the password is shown only now — it is not stored in readable form.</p>
          <div className="kw-panel" style={{ margin: "12px 0", fontSize: 16 }}>
            <div>Login ID: <b>{created.username}</b></div>
            <div style={{ marginTop: 6 }}>Password: <b>{created.password}</b></div>
          </div>
          <div className="db-modal-foot">
            <button type="button" className="kw-btn db-btn-line" onClick={copy}>{copied ? "Copied ✓" : "Copy ID & password"}</button>
            <button type="button" className="kw-btn" onClick={() => { setCreated(null); setCopied(false); }}>Done</button>
          </div>
        </Modal>
      )}
    </>
  );
}
