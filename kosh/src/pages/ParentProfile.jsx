import { useEffect, useState } from "react";
import { parentPortalService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const fmt = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const Tile = ({ ic, l, v }) => (
  <div style={{ border: "1px solid #e4e9f2", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
    <span style={{ width: 40, height: 40, borderRadius: 12, background: "#e0edff", display: "grid", placeItems: "center", fontSize: 18, flex: "none" }}>{ic}</span>
    <div style={{ minWidth: 0 }}><small style={{ color: "#8a94a6" }}>{l}</small><div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{v}</div></div>
  </div>
);
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 };

/* "Student Profile" tab: the child's registration details (read-only) + the parent's own login details. */
export default function ParentProfile() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const load = () => { setErr(""); parentPortalService.profile().then(setD).catch((e) => setErr(getErrorMessage(e))); };
  useEffect(load, []);

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!d) return <LoadingState label="Loading profile…" />;
  const { child: p, parent } = d;
  if (!p) return <div className="kd-card kd-full"><div className="kd-empty">👤<br />No child is linked to this account yet.<br />Please contact the institute.</div></div>;

  const rows = [
    ["🎓", "Standard", p.standard + (p.target ? ` · ${p.target}` : "")],
    ["🗣️", "Medium", p.medium || "—"],
    ["🎂", "Date of birth", fmt(p.dateOfBirth)],
    ["🏫", "School", p.schoolName || "—"],
    ["📱", "Student mobile", p.mobile || "—"],
    ["✉️", "Student email", p.email || "—"],
    ["🏢", "Branch", p.branchName || "—"],
    ["📅", "Registered on", fmt(p.registeredOn)],
    ["🆔", "Student login ID", p.username || "—"],
    ["🟢", "Status", p.status || "Active"],
  ];
  return (
    <>
      <section className="kd-hero kd-full" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "3px solid rgba(255,255,255,.5)", display: "grid", placeItems: "center", fontSize: 38, fontWeight: 700 }}>{(p.name || "?")[0].toUpperCase()}</div>
        <div>
          <small>Student Profile</small>
          <h1 style={{ margin: "2px 0 8px" }}>{p.name}</h1>
          <span className="kd-pill">🎓 Std {p.standard}</span>
          {p.target && <span className="kd-pill">🎯 {p.target}</span>}
          {p.branchName && <span className="kd-pill">🏢 {p.branchName}</span>}
        </div>
      </section>

      <section className="kd-card kd-full">
        <h3>Student details</h3>
        <div className="in" style={grid}>{rows.map(([ic, l, v]) => <Tile key={l} ic={ic} l={l} v={v} />)}</div>
        <p style={{ margin: 0, padding: "0 20px 18px", color: "#8a94a6", fontSize: 13 }}>To change any detail, please contact the institute.</p>
      </section>

      <section className="kd-card kd-full">
        <h3>Your parent account</h3>
        <div className="in" style={grid}>
          <Tile ic="👨‍👩‍👧" l="Parent name" v={parent.name || "—"} />
          <Tile ic="📞" l="Mobile" v={parent.mobile || p.parentMobile || "—"} />
          <Tile ic="✉️" l="Email" v={parent.email || "—"} />
          <Tile ic="🆔" l="Parent login ID" v={parent.username || "—"} />
        </div>
      </section>
    </>
  );
}
