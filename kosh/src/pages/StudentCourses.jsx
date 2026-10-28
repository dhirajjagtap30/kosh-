import { useEffect, useMemo, useState } from "react";
import { studentCourseService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";
import { LESSON_ICON } from "../dashboard/data";

const css = `
.kc-chips{display:flex;gap:8px;flex-wrap:wrap}
.kc-chip{border:1px solid #cbd5e8;background:#fff;color:#0a2463;border-radius:999px;padding:7px 14px;font:500 14px inherit;font-family:inherit;cursor:pointer}
.kc-chip.on{background:#2563eb;border-color:#2563eb;color:#fff}
.kc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.kc-card{border:1px solid #e4e9f2;border-radius:16px;padding:16px;display:grid;gap:8px;background:#fff}
.kc-card h4{margin:0;font-size:17px;color:#0a2463}
.kc-sm{color:#3b4660;font-size:13px}
.kc-bar{height:9px;background:#e6eaf2;border-radius:99px;overflow:hidden}.kc-bar>div{height:100%;background:#2563eb;border-radius:99px}
.kc-view{display:grid;grid-template-columns:320px 1fr;gap:18px;align-items:start}
.kc-list{border:1px solid #e4e9f2;border-radius:14px;overflow:hidden;max-height:70vh;overflow-y:auto}
.kc-ch{background:#f3f6fc;padding:8px 14px;font-size:12px;font-weight:600;color:#44506a;text-transform:uppercase;letter-spacing:.4px}
.kc-les{display:flex;gap:10px;align-items:center;width:100%;text-align:left;border:0;border-top:1px solid #eef2fa;background:#fff;padding:11px 14px;font:inherit;font-size:14px;color:#0a2463;cursor:pointer}
.kc-les.on{background:#dceafe;font-weight:600}.kc-les:hover{background:#eef3fc}
.kc-tick{margin-left:auto;color:#16a34a;font-weight:700}
.kc-play{border:1px solid #e4e9f2;border-radius:14px;padding:18px;display:grid;gap:12px;min-width:0}
.kc-play iframe{width:100%;aspect-ratio:16/9;border:0;border-radius:12px;background:#000}
.kc-row{display:flex;gap:10px;flex-wrap:wrap}
@media(max-width:860px){.kc-view{grid-template-columns:1fr}.kc-list{max-height:none}}
`;

/* YouTube watch / short / embed links play inside the page; every other link opens in a new tab. */
const embedUrl = (u) => {
  const m = String(u || "").match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : "";
};
const SUB_ICON = { Physics: "⚛️", Chemistry: "🧪", Mathematics: "📐", Biology: "🧬", Science: "🔬", English: "📖", Marathi: "📖", Hindi: "📖", "Social Science": "🌍" };

function Player({ course, onBack, onChange, goTests }) {
  const [sel, setSel] = useState(() => { const first = course.lessons.find((l) => !course.doneLessonIds.includes(l.id)); return (first || course.lessons[0] || {}).id; });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const idx = course.lessons.findIndex((l) => l.id === sel);
  const l = course.lessons[idx];
  const done = l && course.doneLessonIds.includes(l.id);
  const chapters = useMemo(() => { const m = new Map(); course.lessons.forEach((x) => { const k = x.chapter || "Lessons"; if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return [...m]; }, [course.lessons]);

  const toggle = async () => {
    setBusy(true); setErr("");
    try { onChange(await studentCourseService.mark(course.id, l.id, !done)); } catch (e) { setErr(getErrorMessage(e)); }
    setBusy(false);
  };
  const emb = l && l.kind === "Video" ? embedUrl(l.url) : "";
  return (
    <section className="kd-card">
      <h3 style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="kc-chip" onClick={onBack}>← All courses</button>
        <span>{SUB_ICON[course.subject] || "📘"} {course.title}</span>
      </h3>
      <div className="in" style={{ display: "grid", gap: 14 }}>
        <div><div className="kd-sub"><span>{course.doneLessonIds.length} of {course.lessons.length} lessons completed</span><b>{course.percent}%</b></div><div className="kc-bar"><div style={{ width: `${course.percent}%` }} /></div></div>
        {!course.lessons.length ? <div className="kd-empty">🛠️<br />Your teacher has not added lessons yet</div> : (
          <div className="kc-view">
            <div className="kc-list">
              {chapters.map(([name, items]) => (
                <div key={name}>
                  <div className="kc-ch">{name}</div>
                  {items.map((x) => (
                    <button type="button" key={x.id} className={`kc-les${x.id === sel ? " on" : ""}`} onClick={() => { setSel(x.id); setErr(""); }}>
                      <span>{LESSON_ICON[x.kind]}</span><span>{x.title}</span>{course.doneLessonIds.includes(x.id) && <span className="kc-tick" aria-label="Completed">✓</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {l && (
              <div className="kc-play">
                <div><b style={{ fontSize: 19, color: "#0a2463" }}>{LESSON_ICON[l.kind]} {l.title}</b><div className="kc-sm">{l.chapter} · {l.kind}{l.minutes ? ` · ${l.minutes} min` : ""}</div></div>
                {emb && <iframe src={emb} title={l.title} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />}
                {l.kind === "Video" && !emb && (l.url ? <a className="kw-btn" style={{ justifySelf: "start" }} href={l.url} target="_blank" rel="noopener noreferrer">▶ Open video lecture</a> : <div className="kc-sm">Video link will be added by your teacher.</div>)}
                {l.kind === "Notes" && (l.url ? <a className="kw-btn" style={{ justifySelf: "start" }} href={l.url} target="_blank" rel="noopener noreferrer">📄 Open notes</a> : <div className="kc-sm">Notes will be shared soon.</div>)}
                {l.kind === "Live class" && (<><div className="kc-sm">🕒 {l.when || "Schedule will be announced"}</div>{l.url && <a className="kw-btn" style={{ justifySelf: "start" }} href={l.url} target="_blank" rel="noopener noreferrer">🔴 Join live class</a>}</>)}
                {l.kind === "Practice" && <button type="button" className="kw-btn" style={{ justifySelf: "start" }} onClick={goTests}>✍️ Go to Tests</button>}
                {err && <div className="kd-empty" role="alert" style={{ padding: 6, color: "#b91c1c" }}>{err}</div>}
                <div className="kc-row">
                  <button type="button" className="kw-btn" disabled={busy} onClick={toggle}>{done ? "✓ Completed (undo)" : "Mark as completed"}</button>
                  {idx < course.lessons.length - 1 && <button type="button" className="kw-btn db-btn-line" onClick={() => setSel(course.lessons[idx + 1].id)}>Next lesson →</button>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* "My Courses" tab of the Student Dashboard: the LMS courses of the student's standard (and exam target for 11th / 12th). */
export default function StudentCourses({ goTests }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [sub, setSub] = useState("All");
  const [open, setOpen] = useState(null);
  const load = () => { setErr(""); studentCourseService.list().then(setRows).catch((e) => setErr(getErrorMessage(e))); };
  useEffect(load, []);

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!rows) return <LoadingState label="Loading your courses…" />;
  const course = open && rows.find((c) => c.id === open);
  const update = (c) => setRows((r) => r.map((x) => (x.id === c.id ? c : x)));
  if (course) return <><style>{css}</style><Player course={course} onBack={() => setOpen(null)} onChange={update} goTests={goTests} /></>;

  const subjects = [...new Set(rows.map((r) => r.subject))].sort();
  const list = rows.filter((r) => sub === "All" || r.subject === sub);
  const track = rows.find((r) => r.target) ? rows.find((r) => r.target).target : "";
  return (
    <section className="kd-card">
      <style>{css}</style>
      <h3>My Courses{rows[0] ? <small style={{ fontSize: 13, fontWeight: 500, marginLeft: 10 }}>{rows[0].standard}{track ? ` · ${track}` : ""}</small> : null}</h3>
      <div className="in" style={{ display: "grid", gap: 14 }}>
        {subjects.length > 1 && (
          <div className="kc-chips">{["All", ...subjects].map((s) => <button type="button" key={s} className={`kc-chip${sub === s ? " on" : ""}`} onClick={() => setSub(s)}>{s === "All" ? "All subjects" : s}</button>)}</div>
        )}
        {!list.length && <div className="kd-empty">🎓<br />No courses for your standard{track ? " and exam target" : ""} yet</div>}
        <div className="kc-grid">
          {list.map((c) => (
            <div className="kc-card" key={c.id}>
              <h4>{SUB_ICON[c.subject] || "📘"} {c.title}</h4>
              {c.description && <div className="kc-sm">{c.description}</div>}
              <div className="kc-sm">{c.lessons.length} lessons · {c.doneLessonIds.length} done</div>
              <div className="kc-bar"><div style={{ width: `${c.percent}%` }} /></div>
              <button type="button" className="kw-btn" onClick={() => setOpen(c.id)}>{c.percent === 0 ? "Start course" : c.percent === 100 ? "Review course" : `Continue · ${c.percent}%`}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
