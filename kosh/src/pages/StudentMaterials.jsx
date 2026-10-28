import { useEffect, useMemo, useState } from "react";
import { materialService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const fmt = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

/* "Study Material" tab of the Student Dashboard: notes + video links the admin uploaded for the student's standard. */
export default function StudentMaterials() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [sub, setSub] = useState("All");
  const [kind, setKind] = useState("All");
  const load = () => { setErr(""); materialService.forStudent().then(setRows).catch((e) => setErr(getErrorMessage(e))); };
  useEffect(load, []);

  const subjects = useMemo(() => [...new Set((rows || []).map((r) => r.subject))].sort(), [rows]);
  const list = (rows || []).filter((r) => (sub === "All" || r.subject === sub) && (kind === "All" || r.kind === kind));

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!rows) return <LoadingState label="Loading study material…" />;
  const sel = { border: "1px solid #cbd5e8", borderRadius: 10, padding: "8px 12px", font: "inherit", color: "#0a2463", background: "#fff" };
  return (
    <section className="kd-card">
      <h3>Study Material</h3>
      <div className="in" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select style={sel} aria-label="Subject" value={sub} onChange={(e) => setSub(e.target.value)}><option value="All">All subjects</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select>
          <select style={sel} aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)}><option value="All">Notes + Videos</option><option value="Note">Notes</option><option value="Video">Videos</option></select>
        </div>
        {!list.length && <div className="kd-empty">📚<br />No study material for your standard yet</div>}
        {list.map((x) => (
          <div key={x.id} style={{ border: "1px solid #e4e9f2", borderRadius: 14, padding: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 17, color: "#0a2463" }}>{x.kind === "Video" ? "🎬" : "📄"} {x.title}</b>
              <div style={{ color: "#3b4660", fontSize: 14, marginTop: 4 }}>{x.subject} · {x.kind === "Video" ? "Video lecture" : "Notes"}{x.createdOn ? ` · ${fmt(x.createdOn)}` : ""}</div>
              {x.description && <div style={{ color: "#3b4660", fontSize: 14, marginTop: 4 }}>{x.description}</div>}
            </div>
            {x.kind === "Video"
              ? <a className="kw-btn" href={x.url} target="_blank" rel="noopener noreferrer">▶ Watch video</a>
              : <a className="kw-btn" href={x.fileUrl} download={x.fileName || true} target="_blank" rel="noopener noreferrer">⬇ Download notes</a>}
          </div>
        ))}
      </div>
    </section>
  );
}
