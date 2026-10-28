import { useEffect, useState } from "react";
import { studentProfileService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const fmt = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

/* "Profile" tab of the Student Dashboard: the student's own registration details (read-only). */
export default function StudentProfile() {
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const load = () => { setErr(""); studentProfileService.get().then(setP).catch((e) => setErr(getErrorMessage(e))); };
  useEffect(load, []);

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!p) return <LoadingState label="Loading your profile…" />;
  const rows = [
    ["🎓", "Standard", p.standard + (p.target ? ` · ${p.target}` : "")],
    ["🗣️", "Medium", p.medium || "—"],
    ["📱", "Mobile", p.mobile || "—"],
    ["✉️", "Email", p.email || "—"],
    ["🎂", "Date of birth", fmt(p.dateOfBirth)],
    ["🏫", "School", p.schoolName || "—"],
    ["👨‍👩‍👧", "Parent", p.parentName || "—"],
    ["📞", "Parent mobile", p.parentMobile || "—"],
    ["🏢", "Branch", p.branchName || "—"],
    ["📅", "Registered on", fmt(p.registeredOn)],
    ["🆔", "Login ID", p.username || "—"],
  ];
  return (
    <>
      <section className="kd-hero kd-full" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "3px solid rgba(255,255,255,.5)", display: "grid", placeItems: "center", fontSize: 38, fontWeight: 700 }}>{(p.name || "?")[0].toUpperCase()}</div>
        <div>
          <small>My Profile</small>
          <h1 style={{ margin: "2px 0 8px" }}>{p.name}</h1>
          <span className="kd-pill">🎓 Std {p.standard}</span>
          {p.target && <span className="kd-pill">🎯 {p.target}</span>}
          {p.branchName && <span className="kd-pill">🏢 {p.branchName}</span>}
        </div>
      </section>
      <section className="kd-card kd-full">
        <h3>Personal details</h3>
        <div className="in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          {rows.map(([ic, l, v]) => (
            <div key={l} style={{ border: "1px solid #e4e9f2", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: "#e0edff", display: "grid", placeItems: "center", fontSize: 18, flex: "none" }}>{ic}</span>
              <div style={{ minWidth: 0 }}><small style={{ color: "#8a94a6" }}>{l}</small><div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{v}</div></div>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, padding: "0 20px 18px", color: "#8a94a6", fontSize: 13 }}>To change any detail, please contact your institute.</p>
      </section>
    </>
  );
}
