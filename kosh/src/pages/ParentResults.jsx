import { useEffect, useMemo, useState } from "react";
import { parentPortalService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const fmt = (d) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const colorOf = (p) => (p == null ? "#8a94a6" : p >= 75 ? "#16a34a" : p >= 40 ? "#d97706" : "#dc2626");
const chip = (bg, fg) => ({ background: bg, color: fg, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 });

/* "Student Result" tab: every online exam the child has written (marks, %, rank once announced) + tests still to be written. */
export default function ParentResults() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const load = () => { setErr(""); parentPortalService.results().then(setD).catch((e) => setErr(getErrorMessage(e))); };
  useEffect(load, []);

  const out = useMemo(() => (d ? d.results.filter((r) => r.announced) : []), [d]);
  const avg = out.length ? Math.round(out.reduce((a, r) => a + r.percent, 0) / out.length) : null;
  const best = out.length ? Math.max(...out.map((r) => r.percent)) : null;

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!d) return <LoadingState label="Loading results…" />;

  return (
    <>
      <div className="kd-stats5 kd-full" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {[["📋", "#e0f0ff", d.results.length, "Tests written"], ["✅", "#dff7e6", out.length, "Results out"], ["⏳", "#fff1cc", d.results.length - out.length, "Result awaited"], ["📊", "#dbeafe", avg == null ? "--" : `${avg}%`, "Average"], ["🏆", "#fde7f3", best == null ? "--" : `${best}%`, "Best score"]].map(([ic, bg, n, l]) => (
          <div className="kd-stat" key={l}><div className="ic" style={{ background: bg }}>{ic}</div><b>{n}</b><span>{l}</span></div>
        ))}
      </div>

      <section className="kd-card kd-full">
        <h3>Test results</h3>
        <div className="in" style={{ display: "grid", gap: 12 }}>
          {!d.results.length && <div className="kd-empty">📊<br />Your child has not written any test yet</div>}
          {d.results.map((r) => (
            <div key={r.id} style={{ border: "1px solid #e4e9f2", borderRadius: 14, padding: 16, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                <b style={{ fontSize: 17, color: "#0a2463" }}>{r.examTitle}</b>
                <div style={{ color: "#3b4660", fontSize: 14, marginTop: 4 }}>{r.subject ? `${r.subject} · ` : ""}{fmt(r.testDate || r.submittedOn)}</div>
                {r.announced && (
                  <>
                    <div className="kd-bar" style={{ margin: "10px 0 8px", maxWidth: 340 }}><div style={{ width: `${r.percent}%`, background: colorOf(r.percent) }} /></div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={chip("#dff7e6", "#15803d")}>✔ {r.correct} correct</span>
                      <span style={chip("#ffe0e0", "#b91c1c")}>✘ {r.wrong} wrong</span>
                      <span style={chip("#eef1f6", "#5b667c")}>— {r.unattempted} skipped</span>
                    </div>
                  </>
                )}
              </div>
              <div style={{ textAlign: "center", minWidth: 110 }}>
                {r.announced ? (
                  <>
                    <b style={{ fontSize: 24, color: colorOf(r.percent) }}>{r.score}/{r.total}</b>
                    <div style={{ fontSize: 13, color: "#8a94a6" }}>{r.percent}%</div>
                    <div style={{ fontSize: 13, color: "#0a2463", fontWeight: 600, marginTop: 4 }}>🏅 Rank {r.rank} of {r.appeared}</div>
                  </>
                ) : <span style={{ color: "#b45309", fontWeight: 600, fontSize: 14 }}>⏳ Result awaited</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {d.pending.length > 0 && (
        <section className="kd-card kd-full">
          <h3>Tests not written yet</h3>
          <div className="in" style={{ display: "grid", gap: 10 }}>
            {d.pending.map((t) => (
              <div key={t.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", border: "1px solid #e4e9f2", borderRadius: 12, padding: "12px 14px" }}>
                <div><b>{t.title}</b><div style={{ color: "#3b4660", fontSize: 14 }}>{t.subject ? `${t.subject} · ` : ""}{fmt(t.date)} · {t.totalMarks} marks</div></div>
                <span style={t.status === "Live" ? chip("#dff7e6", "#15803d") : t.status === "Closed" ? chip("#ffe0e0", "#b91c1c") : chip("#fff1cc", "#b45309")}>{t.status === "Live" ? "Open now" : t.status === "Closed" ? "Missed / closed" : "Scheduled"}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
