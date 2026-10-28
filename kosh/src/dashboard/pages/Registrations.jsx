import { useMemo, useState } from "react";
import { registrationService } from "../../services";
import { useAuth } from "../../auth/AuthContext";
import { useCollection, useForm, Gate } from "../useCollection";
import { REG_STANDARDS, MEDIUMS, REG_STATUS, EXAM_TARGETS, needsTarget } from "../data";
import { fmtDate, downloadCSV } from "../utils";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

const EMPTY = { name: "", mobile: "", standard: "", target: "", medium: "", dateOfBirth: "", email: "", parentName: "", parentMobile: "", schoolName: "", username: "", password: "", status: "Active", biometricId: "" };

function RegForm({ item, onSubmit, onCancel }) {
  const editing = Boolean(item);
  const { f, setF, set, err, busy, submit } = useForm(item ? { ...EMPTY, ...item, password: "" } : EMPTY, onSubmit, (v) => {
    if (!v.name.trim()) return "Enter the student name.";
    if (!/^\d{10}$/.test(v.mobile)) return "Mobile number must be 10 digits.";
    if (!v.standard || !v.medium) return "Select standard and medium.";
    if (needsTarget(v.standard) && !v.target) return "Select the exam target (JEE Main / JEE Advanced / NEET / MHT-CET).";
    if (!v.dateOfBirth) return "Select the date of birth.";
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) return "Enter a valid email address.";
    if (!v.parentName.trim()) return "Enter the parent name.";
    if (!/^\d{10}$/.test(v.parentMobile)) return "Parent mobile must be 10 digits.";
    if (!v.schoolName.trim()) return "Enter the school name.";
    if (v.username.trim().length < 3 || /\s/.test(v.username.trim())) return "Login ID must be at least 3 characters, without spaces.";
    if (!editing && v.password.length < 6) return "Password must be at least 6 characters.";
    if (editing && v.password && v.password.length < 6) return "New password must be at least 6 characters.";
    return "";
  });
  const sel = (k, label, list) => (
    <label className="db-field">{label}
      <select className="db-input" value={f[k]} onChange={set(k)}><option value="">Select</option>{list.map((x) => <option key={x}>{x}</option>)}</select>
    </label>
  );
  const inp = (k, label, props = {}) => <label className="db-field">{label}<input className="db-input" value={f[k]} onChange={set(k)} {...props} /></label>;
  return (
    <form onSubmit={submit} noValidate>
      {inp("name", "Student name", { autoFocus: true })}
      <div className="db-row2">{inp("mobile", "Mobile", { inputMode: "numeric", maxLength: 10 })}{inp("dateOfBirth", "Date of birth", { type: "date" })}</div>
      <div className="db-row2">{sel("standard", "Standard", REG_STANDARDS)}{sel("medium", "Medium", MEDIUMS)}</div>
      {needsTarget(f.standard) && sel("target", "Exam target", EXAM_TARGETS)}
      {inp("email", "Email", { type: "email" })}
      <div className="db-row2">{inp("parentName", "Parent name")}{inp("parentMobile", "Parent mobile", { inputMode: "numeric", maxLength: 10 })}</div>
      {inp("schoolName", "School name")}
      <div className="db-row2">
        {inp("username", "Login ID", { autoCapitalize: "none", spellCheck: "false" })}
        {inp("password", editing ? "New password (blank = keep)" : "Password", { type: "text", autoComplete: "off" })}
      </div>
      <div className="db-row2">
        {sel("status", "Account status", REG_STATUS)}
        {inp("biometricId", "Biometric ID (optional)", { placeholder: "ID on the attendance machine", maxLength: 20 })}
      </div>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add registration"}</button>
      </div>
    </form>
  );
}

export default function Registrations() {
  const c = useCollection(registrationService);
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [std, setStd] = useState("All");
  const [med, setMed] = useState("All");
  const [st, setSt] = useState("All");
  const [tg, setTg] = useState("All");
  const [modal, setModal] = useState(null); // null | "new" | row

  const rows = useMemo(() => (c.rows || [])
    .filter((r) => `${r.name} ${r.mobile} ${r.username} ${r.parentName} ${r.schoolName}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((r) => std === "All" || r.standard === std)
    .filter((r) => med === "All" || r.medium === med)
    .filter((r) => tg === "All" || r.target === tg)
    .filter((r) => st === "All" || r.status === st), [c.rows, q, std, med, st, tg]);

  const exportCsv = () => downloadCSV("registrations.csv", [
    ["ID", "Name", "Mobile", "Standard", "Exam target", "Medium", "DOB", "Email", "Parent", "Parent mobile", "School", "Login ID", "Biometric ID", "Status", "Registered on"],
    ...rows.map((r) => [r.id, r.name, r.mobile, r.standard, r.target || "", r.medium, r.dateOfBirth, r.email, r.parentName, r.parentMobile, r.schoolName, r.username, r.biometricId || "", r.status, r.registeredOn]),
  ]);

  const columns = [
    { key: "name", label: "Student", sortable: true, render: (r) => <b>{r.name}</b> },
    ...(user && user.role === "superadmin" ? [{ key: "branchName", label: "Branch", sortable: true }] : []),
    { key: "standard", label: "Std", sortable: true },
    { key: "target", label: "Exam target", sortable: true, render: (r) => r.target || "—" },
    { key: "medium", label: "Medium", sortable: true },
    { key: "mobile", label: "Mobile" },
    { key: "parentName", label: "Parent", render: (r) => <>{r.parentName}<br /><small className="db-muted">{r.parentMobile}</small></> },
    { key: "schoolName", label: "School", sortable: true },
    { key: "username", label: "Login ID" },
    { key: "biometricId", label: "Biometric ID", render: (r) => r.biometricId || "—" },
    { key: "registeredOn", label: "Registered", sortable: true, render: (r) => (r.registeredOn ? fmtDate(r.registeredOn) : "—") },
    { key: "status", label: "Status", sortable: true, render: (r) => <span className={`db-badge-s ${r.status === "Active" ? "completed" : "draft"}`}>{r.status}</span> },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="db-actions">
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal(r)}>Edit</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => c.save(r.id, { status: r.status === "Active" ? "Inactive" : "Active" })}>{r.status === "Active" ? "Deactivate" : "Activate"}</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => c.remove(r, r.name)}>Delete</button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Registrations" sub="All students who registered on the website, plus students you add yourself.">
        <button type="button" className="kw-btn db-btn-line" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
        <button type="button" className="kw-btn" onClick={() => setModal("new")} disabled={!c.rows}>Add registration</button>
      </PageHeader>
      <Gate cs={c} label="Loading registrations…">
        <div className="db-toolbar">
          <input className="db-input grow" type="search" placeholder="Search name, mobile, school, parent…" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="db-input" aria-label="Standard" value={std} onChange={(e) => setStd(e.target.value)}><option value="All">All standards</option>{REG_STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="db-input" aria-label="Exam target" value={tg} onChange={(e) => setTg(e.target.value)}><option value="All">All targets</option>{EXAM_TARGETS.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="db-input" aria-label="Medium" value={med} onChange={(e) => setMed(e.target.value)}><option value="All">All mediums</option>{MEDIUMS.map((x) => <option key={x}>{x}</option>)}</select>
          <select className="db-input" aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)}><option value="All">All status</option>{REG_STATUS.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <DataTable columns={columns} rows={rows} pageSize={8} initialSort={{ key: "registeredOn", dir: "desc" }} emptyText="No registrations match your filters." />
      </Gate>
      {modal && (
        <Modal title={modal === "new" ? "Add registration" : "Edit registration"} onClose={() => setModal(null)}>
          <RegForm item={modal === "new" ? null : modal} onCancel={() => setModal(null)}
            onSubmit={async (f) => { const { id, registeredOn, ...body } = f; const res = await c.save(modal === "new" ? null : modal.id, body); if (res.ok) setModal(null); return res; }} />
        </Modal>
      )}
    </>
  );
}
