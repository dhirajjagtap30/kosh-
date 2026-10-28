import { useEffect, useState } from "react";
import { parentPortalService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const when = (d) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/* "View Notices" tab: announcements written by the institute for parents (+ test alerts sent to the child). */
export default function ParentNotices({ onSeen }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const load = () => { setErr(""); parentPortalService.notices().then((r) => { setRows(r); if (onSeen) onSeen(); }).catch((e) => setErr(getErrorMessage(e))); };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!rows) return <LoadingState label="Loading notices…" />;
  return (
    <section className="kd-card kd-full">
      <h3>Notices &amp; announcements</h3>
      <div className="in" style={{ display: "grid", gap: 12 }}>
        {!rows.length && <div className="kd-empty">📢<br />No notices right now</div>}
        {rows.map((n) => (
          <div key={n.id} style={{ border: `1px solid ${n.pinned ? "#93c5fd" : "#e4e9f2"}`, background: n.pinned ? "#f3f8ff" : "#fff", borderRadius: 14, padding: 16, display: "flex", gap: 14 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: n.kind === "Test" ? "#fff1cc" : "#e0edff", display: "grid", placeItems: "center", fontSize: 20, flex: "none" }}>{n.kind === "Test" ? "📋" : "📢"}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <b style={{ color: "#0a2463", fontSize: 16 }}>{n.pinned ? "📌 " : ""}{n.title}</b>
                <small style={{ color: "#8a94a6" }}>{when(n.createdOn)}</small>
              </div>
              <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#3b4660" }}>{n.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
