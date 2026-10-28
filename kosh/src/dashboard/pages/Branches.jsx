import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { branchService } from "../../services";
import { useAuth } from "../../auth/AuthContext";
import { useBrand } from "../../branding/BrandContext";
import { setViewBranch } from "../../branding/viewBranch";
import { useCollection, useForm, Gate } from "../useCollection";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

const MAX_LOGO = 250_000;
const EMPTY = { name: "", code: "", city: "", address: "", phone: "", email: "", brandName: "", instituteName: "", tagline: "", logo: "", primaryColor: "#2563eb", darkColor: "#0a2463", domain: "", status: "Active", adminName: "", adminUsername: "", adminPassword: "", adminEmail: "" };
const readUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("Could not read the logo.")); r.readAsDataURL(file); });

/* Live look of the brand while the super admin edits it. */
function Preview({ f }) {
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #dbe7ff", margin: "4px 0 12px" }}>
      <div style={{ background: `linear-gradient(90deg,${f.darkColor},${f.primaryColor})`, color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        {f.logo ? <img src={f.logo} alt="" width="38" height="38" style={{ objectFit: "contain" }} /> : <span style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "grid", placeItems: "center", fontWeight: 700 }}>{(f.brandName || "?").slice(0, 1).toUpperCase()}</span>}
        <span><b style={{ display: "block", letterSpacing: .5 }}>{(f.brandName || "Brand name").toUpperCase()}</b><small style={{ opacity: .8 }}>{f.tagline || "Tagline"}</small></span>
        <span style={{ marginLeft: "auto", background: "#fff", color: f.primaryColor, borderRadius: 999, padding: "6px 14px", fontWeight: 600, fontSize: 13 }}>Login</span>
      </div>
      <div style={{ padding: "10px 16px", background: "#fff", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ background: f.primaryColor, color: "#fff", borderRadius: 10, padding: "7px 14px", fontSize: 13 }}>Primary button</span>
        <span style={{ background: `color-mix(in srgb, ${f.primaryColor} 14%, white)`, color: f.darkColor, borderRadius: 10, padding: "7px 14px", fontSize: 13 }}>Highlight</span>
        <small className="db-muted">{f.instituteName || "Institute name"}</small>
      </div>
    </div>
  );
}

function BranchForm({ item, onSubmit, onCancel }) {
  const editing = Boolean(item);
  const [logoErr, setLogoErr] = useState("");
  const { f, setF, set, err, busy, submit } = useForm(item ? { ...EMPTY, ...item } : EMPTY, onSubmit, (v) => {
    if (!v.name.trim()) return "Enter the branch name.";
    if (!/^[a-z0-9-]{2,20}$/i.test(v.code.trim())) return "Branch code: 2-20 letters, digits or hyphen.";
    if (!v.brandName.trim() || !v.instituteName.trim()) return "Enter the brand name and the full institute name.";
    if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) return "Enter a valid branch email.";
    if (!editing && v.adminUsername.trim()) {
      if (!v.adminName.trim()) return "Enter the branch admin's name.";
      if (v.adminUsername.trim().length < 3 || /\s/.test(v.adminUsername.trim())) return "Admin ID: at least 3 characters, no spaces.";
      if (v.adminPassword.length < 6) return "Admin password must be at least 6 characters.";
    }
    return "";
  });
  const pickLogo = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > MAX_LOGO) { setLogoErr("Logo must be under 250 KB."); e.target.value = ""; return; }
    setLogoErr("");
    const logo = await readUrl(file);
    setF((p) => ({ ...p, logo }));
  };
  const inp = (k, label, props = {}) => <label className="db-field">{label}<input className="db-input" value={f[k] || ""} onChange={set(k)} {...props} /></label>;
  return (
    <form onSubmit={submit} noValidate>
      <b>Branch</b>
      <div className="db-row2">{inp("name", "Branch name", { placeholder: "e.g. Pune Branch", autoFocus: true })}{inp("code", "Branch code (used in the link)", { placeholder: "e.g. pune", autoCapitalize: "none" })}</div>
      <div className="db-row2">{inp("city", "City")}{inp("phone", "Phone")}</div>
      <div className="db-row2">{inp("email", "Email", { type: "email" })}{inp("address", "Address")}</div>

      <b style={{ display: "block", marginTop: 8 }}>White-label brand</b>
      <Preview f={f} />
      <div className="db-row2">{inp("brandName", "Brand name (top bar)", { placeholder: "e.g. Shivneri" })}{inp("instituteName", "Full institute name", { placeholder: "e.g. Shivneri Academy" })}</div>
      {inp("tagline", "Tagline", { placeholder: "e.g. NEET • JEE • FOUNDATION" })}
      <div className="db-row2">
        <label className="db-field">Primary colour<input className="db-input" type="color" value={f.primaryColor} onChange={set("primaryColor")} style={{ padding: 2, height: 42 }} /></label>
        <label className="db-field">Dark colour (top bar)<input className="db-input" type="color" value={f.darkColor} onChange={set("darkColor")} style={{ padding: 2, height: 42 }} /></label>
      </div>
      <label className="db-field">Logo (PNG / JPG / SVG, under 250 KB)
        <input className="db-input" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={pickLogo} />
        {f.logo && <small className="db-muted">Logo added. <button type="button" className="db-link-btn" onClick={() => setF((p) => ({ ...p, logo: "" }))}>Remove</button></small>}
        {logoErr && <small className="db-err" role="alert">{logoErr}</small>}
      </label>
      {inp("domain", "Own website domain (optional)", { placeholder: "e.g. shivneri.in", autoCapitalize: "none" })}
      <label className="db-field">Status<select className="db-input" value={f.status} onChange={set("status")}><option>Active</option><option>Inactive</option></select></label>

      {!editing && (
        <>
          <b style={{ display: "block", marginTop: 8 }}>Branch admin login (optional)</b>
          <p className="db-muted" style={{ marginTop: 0 }}>This person manages only this branch. You can also add admins later from Staff &amp; Trainers (choose the branch in the top bar).</p>
          <div className="db-row2">{inp("adminName", "Admin name")}{inp("adminEmail", "Admin email", { type: "email" })}</div>
          <div className="db-row2">{inp("adminUsername", "Admin ID", { autoCapitalize: "none" })}{inp("adminPassword", "Password", { autoComplete: "off" })}</div>
        </>
      )}
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create branch"}</button>
      </div>
    </form>
  );
}

export default function Branches() {
  const { user } = useAuth();
  const { branches: publicList } = useBrand();
  const c = useCollection(branchService);
  const [modal, setModal] = useState(null);
  const rows = c.rows || [];
  const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
  const data = useMemo(() => rows, [rows]);
  if (user && user.role !== "superadmin") return <Navigate to="/dashboard" replace />; // super admin only

  const openAs = (r) => { setViewBranch(r.id); window.location.assign("/dashboard"); };
  const columns = [
    { key: "name", label: "Branch", sortable: true, render: (r) => (
      <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${r.darkColor},${r.primaryColor})`, flex: "0 0 auto" }} />
        <span><b>{r.name}</b><small className="db-muted" style={{ display: "block" }}>{r.city} · code: {r.code}</small></span>
      </span>) },
    { key: "brandName", label: "Brand", sortable: true, render: (r) => <><b>{r.brandName}</b><small className="db-muted" style={{ display: "block" }}>{r.domain || "no own domain"}</small></> },
    { key: "studentCount", label: "Students", sortable: true },
    { key: "courseCount", label: "Courses", sortable: true },
    { key: "staffCount", label: "Staff", sortable: true },
    { key: "testCount", label: "Tests", sortable: true },
    { key: "status", label: "Status", sortable: true, render: (r) => <span className={`db-badge-s ${r.status === "Active" ? "completed" : "draft"}`}>{r.status}</span> },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="db-actions">
        <button type="button" className="kw-btn db-btn-sm" onClick={() => openAs(r)}>Open panel</button>
        <a className="kw-btn db-btn-sm db-btn-line" href={`/?branch=${r.code}`} target="_blank" rel="noopener noreferrer">Preview site</a>
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setModal(r)}>Edit</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => c.save(r.id, { status: r.status === "Active" ? "Inactive" : "Active" })}>{r.status === "Active" ? "Deactivate" : "Activate"}</button>
        <button type="button" className="kw-btn db-btn-sm db-btn-danger" onClick={() => c.remove(r, `branch "${r.name}"`)}>Delete</button>
      </div>) },
  ];
  return (
    <>
      <PageHeader title="Branches & Brands" sub="Super admin panel — every branch has its own students, staff, courses and tests, and its own white-label brand (name, logo, colours).">
        <button type="button" className="kw-btn" onClick={() => setModal("new")} disabled={!c.rows}>Add branch</button>
      </PageHeader>
      <Gate cs={c} label="Loading branches…">
        <div className="db-stats">
          <StatCard icon="🏢" label="Branches" value={rows.length} note={`${rows.filter((r) => r.status === "Active").length} active`} />
          <StatCard icon="🎓" label="Students (all branches)" value={sum("studentCount")} tone="teal" />
          <StatCard icon="🖥️" label="LMS courses" value={sum("courseCount")} tone="orange" />
          <StatCard icon="👥" label="Staff & admins" value={sum("staffCount")} />
        </div>
        <DataTable columns={columns} rows={data} pageSize={8} initialSort={{ key: "name", dir: "asc" }} emptyText="No branches yet." />
        <p className="db-muted">White-label: a branch link like <b>/?branch=code</b> shows that branch's brand; if you give a branch its own domain, the brand and registration branch are picked automatically from the website address. Branch admins and students always see only their own branch's brand and data. Use the top-bar branch switcher to work inside one branch.</p>
      </Gate>
      {modal && (
        <Modal title={modal === "new" ? "Add branch" : "Edit branch"} wide onClose={() => setModal(null)}>
          <BranchForm item={modal === "new" ? null : modal} onCancel={() => setModal(null)}
            onSubmit={async (f) => {
              const { id, studentCount, courseCount, staffCount, testCount, ...body } = f;
              body.code = body.code.trim().toLowerCase();
              if (modal !== "new") ["adminName", "adminUsername", "adminPassword", "adminEmail"].forEach((k) => delete body[k]);
              const res = await c.save(modal === "new" ? null : modal.id, body);
              if (res.ok) { setModal(null); if (publicList.length) window.setTimeout(() => window.location.reload(), 150); }
              return res;
            }} />
        </Modal>
      )}
    </>
  );
}
