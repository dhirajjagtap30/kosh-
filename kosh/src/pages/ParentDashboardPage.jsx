import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useBrand } from "../branding/BrandContext";
import { parentPortalService, attendanceService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";
import { portalCss } from "../StudentDashboard";
import { localToday, monthKey, summarize } from "../dashboard/attendanceTools";
import MyAttendance from "./MyAttendance";
import ParentProfile from "./ParentProfile";
import ParentResults from "./ParentResults";
import ParentNotices from "./ParentNotices";
import ParentMessages from "./ParentMessages";

const extraCss = `
.kd-side .nb{margin-left:auto;background:#e5232b;color:#fff;border-radius:999px;font-size:11px;font-weight:600;padding:1px 8px}
.kd-side button.on .nb{background:#e5232b}
.kd-ptable{width:100%;border-collapse:collapse;font-size:14px}.kd-ptable th,.kd-ptable td{padding:10px 12px;text-align:left;border-bottom:1px solid #e4e9f2}.kd-ptable th{color:#8a94a6;font-weight:500}
.kd-scroll{overflow-x:auto}
`;

const NAV = [["home", "🏠", "Dashboard"], ["profile", "👤", "Student Profile"], ["results", "🏆", "Student Result"], ["attendance", "🗓️", "Student Attendance"], ["notices", "📢", "View Notices"], ["messages", "💬", "Send Message"]];

function Home({ go, data, extra, user }) {
  const c = data.child;
  const { results, attPct, notices } = extra;
  const out = results ? results.filter((r) => r.announced) : [];
  const latest = out[0];
  const tiles = [
    ["profile", "👤", "#1e3a8a", "Student Profile", "Details of your child", `Std ${c.standard}`],
    ["results", "🏆", "#2563eb", "Student Result", "Marks, rank & tests", latest ? `Latest: ${latest.score}/${latest.total} (${latest.percent}%)` : results ? "No result announced yet" : "—"],
    ["attendance", "🗓️", "#0369a1", "Student Attendance", "Calendar & percentage", attPct == null ? "No records yet" : `${attPct}% this month`],
    ["notices", "📢", "#0f766e", "View Notices", "Announcements from the institute", notices ? `${notices.length} notice${notices.length === 1 ? "" : "s"}` : "—"],
    ["messages", "💬", "#7c3aed", "Send Message", "Write to teachers / admin", "Get a reply here"],
  ];
  return (
    <>
      <section className="kd-hero kd-full">
        <small>Welcome</small>
        <h1>{user.name}</h1>
        <span className="kd-pill">👨‍👩‍👧 Parent of {c.name}</span>
        <span className="kd-pill">🎓 Std {c.standard}</span>
        {c.schoolName && <span className="kd-pill">🏫 {c.schoolName}</span>}
        <div className="kd-3">
          <div><b>{attPct == null ? "--" : `${attPct}%`}</b><span>ATTENDANCE (MONTH)</span></div>
          <div><b>{out.length}</b><span>RESULTS OUT</span></div>
          <div><b>{notices ? notices.length : "--"}</b><span>NOTICES</span></div>
        </div>
      </section>

      {tiles.map(([id, ic, bg, title, sub, right]) => (
        <button key={id} className="kd-link" style={{ background: bg }} onClick={() => go(id)}>
          <div className="kd-ico">{ic}</div>
          <div className="row"><div><h2>{title}</h2><p>{sub}</p></div><span>{right}</span></div>
        </button>
      ))}

      <section className="kd-card kd-full">
        <h3>Published question papers for Std {c.standard}</h3>
        {!data.papers.length ? <div className="kd-empty">🗂️<br />No papers published yet</div> : (
          <div className="in kd-scroll">
            <table className="kd-ptable"><thead><tr><th>Paper</th><th>Subject</th><th>Marks</th><th>Time</th></tr></thead>
              <tbody>{data.papers.map((p) => <tr key={p.id}><td><b>{p.title}</b></td><td>{p.subject}</td><td>{p.totalMarks}</td><td>{p.duration} min</td></tr>)}</tbody></table>
          </div>
        )}
      </section>
    </>
  );
}

/* Parent portal (/parent-dashboard): Dashboard · Student Profile · Student Result · Student Attendance · View Notices · Send Message */
export default function ParentDashboardPage() {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();
  const [tab, setTab] = useState("home");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [extra, setExtra] = useState({ results: null, attPct: null, notices: null });
  const seenKey = `kosh_parent_notices_seen_${user ? user.id : ""}`;
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(seenKey) || ""; } catch { return ""; } });

  const load = useCallback(() => {
    setErr("");
    parentPortalService.dashboard().then(setData).catch((e) => setErr(getErrorMessage(e)));
    // small numbers for the home tiles — best effort, a failure here never blocks the page
    Promise.allSettled([parentPortalService.results(), attendanceService.forParent(), parentPortalService.notices()]).then(([r, a, n]) => {
      const month = monthKey(localToday());
      setExtra({
        results: r.status === "fulfilled" ? r.value.results : null,
        attPct: a.status === "fulfilled" ? summarize(a.value.filter((x) => monthKey(x.date) === month)).percent : null,
        notices: n.status === "fulfilled" ? n.value : null,
      });
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  const markSeen = useCallback(() => { const now = new Date().toISOString(); setSeen(now); try { localStorage.setItem(seenKey, now); } catch { /* private mode */ } }, [seenKey]);
  const fresh = useMemo(() => (extra.notices || []).filter((n) => n.createdOn > seen).length, [extra.notices, seen]);

  const out = () => { logout(); navigate("/parent-login", { replace: true }); };
  const c = data && data.child;

  if (!data) {
    return (
      <div className="kd"><style>{portalCss}</style>
        {err ? <ErrorState fullPage message={err} onRetry={load} /> : <LoadingState fullPage label="Loading parent portal…" />}
      </div>
    );
  }

  return (
    <div className="kd">
      <style>{portalCss}{extraCss}</style>
      <header className="kd-top">
        <Link to="/parent-dashboard" className="kd-brand"><b>{brand.brandName.toUpperCase()}</b><small>PARENT PORTAL</small></Link>
        {c && <button className="kd-inst" type="button" onClick={() => setTab("profile")}>👨‍👩‍👧 {c.name} · Std {c.standard}</button>}
        <Link to="/" className="kd-site">← Back to website</Link>
        <button className="kd-av" aria-label="Student profile" onClick={() => setTab("profile")}>{(user.name || "P")[0].toUpperCase()}</button>
      </header>

      <div className="kd-shell">
        <nav className="kd-side" aria-label="Parent menu">
          {NAV.map(([id, e, l]) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              <span>{e}</span>{l}{id === "notices" && fresh > 0 && <span className="nb">{fresh}</span>}
            </button>
          ))}
          <hr />
          <Link to="/"><span>🌐</span>Back to website</Link>
          <button onClick={out}><span>🚪</span>Logout</button>
        </nav>

        <div>
          <main className="kd-body">
            {!c ? (
              <div className="kd-card kd-full"><div className="kd-empty">👨‍👩‍👧<br />No child is linked to this account yet.<br />Please contact the institute.</div></div>
            ) : (
              <>
                {tab === "home" && <Home go={setTab} data={data} extra={extra} user={user} />}
                {tab === "profile" && <ParentProfile />}
                {tab === "results" && <ParentResults />}
                {tab === "attendance" && (
                  <section className="kd-card kd-full"><h3>Attendance of {c.name}</h3><div className="in"><MyAttendance who="parent" /></div></section>
                )}
                {tab === "notices" && <ParentNotices onSeen={markSeen} />}
                {tab === "messages" && <ParentMessages />}
              </>
            )}
          </main>
          <div className="kd-foot">{brand.instituteName}{brand.city ? ` • ${brand.city}` : ""}</div>
        </div>
      </div>
    </div>
  );
}
