import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { studentPortalService, getErrorMessage } from "./services";
import { LoadingState, ErrorState } from "./components/StatusViews";
import StudentExams from "./pages/StudentExams";
import StudentMaterials from "./pages/StudentMaterials";
import { studentNotificationService } from "./services";
import { useBrand } from "./branding/BrandContext";
import StudentCourses from "./pages/StudentCourses";
import StudentProfile from "./pages/StudentProfile";
import StudentResults from "./pages/StudentResults";
import StudentMockTests from "./pages/StudentMockTests";
import StudentAttendance from "./pages/StudentAttendance";
import StudentMessages from "./pages/StudentMessages";

/* ---------- Styles ---------- */
const css = `
.kd{--navy:#0a2463;--blue:#2563eb;--ink:#0a2463;--mute:#8a94a6;--line:#e4e9f2;
  font-family:'Poppins',system-ui,sans-serif;min-height:100vh;background:#f3f6fc;color:var(--ink)}
.kd *{box-sizing:border-box}
.kd a{color:inherit;text-decoration:none}
.kd-top{position:sticky;top:0;z-index:20;background:#0a2463;color:#fff;display:flex;align-items:center;gap:14px;padding:12px 28px}
.kd-brand b{font-size:22px;letter-spacing:.5px;display:block;line-height:1.1}
.kd-brand small{font-size:11px;opacity:.7;letter-spacing:.5px}
.kd-inst{margin-left:auto;background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:999px;padding:9px 16px;font:500 14px inherit;font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px}
.kd-site{font-size:14px;opacity:.85;padding:8px 6px}.kd-site:hover{opacity:1}
.kd-ic{width:40px;height:40px;border-radius:10px;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:18px;position:relative;cursor:pointer}
.kd-pop{position:absolute;right:0;top:calc(100% + 10px);width:320px;max-width:calc(100vw - 24px);max-height:70vh;overflow:auto;background:#fff;color:#0a2463;border-radius:14px;box-shadow:0 12px 32px rgba(10,36,99,.3);padding:12px;z-index:50}.kd-pop p{margin:8px 0 0;color:#667}.kd-pop ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}.kd-pop li{padding:9px 10px;border-radius:10px;font-size:14px;background:#f6f8fc}.kd-pop li.new{background:#e0edff;font-weight:600}.kd-pop small{display:block;color:#667;font-weight:400;margin-top:2px}
.kd-badge{position:absolute;top:-4px;right:-4px;background:#e5232b;color:#fff;font-size:10px;border-radius:999px;padding:1px 5px}
.kd-av{width:40px;height:40px;border-radius:50%;background:#2563eb;color:#fff;border:2px solid #93c5fd;font-weight:600;cursor:pointer}
.kd-shell{display:grid;grid-template-columns:240px 1fr;gap:28px;max-width:1360px;margin:0 auto;padding:28px;align-items:start}
.kd-side{position:sticky;top:90px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;display:grid;gap:4px}
.kd-side button,.kd-side a{display:flex;align-items:center;gap:12px;background:none;border:0;border-radius:12px;padding:12px 14px;font-size:15px;font-weight:500;font-family:inherit;color:#44506a;cursor:pointer;text-align:left;width:100%}
.kd-side button:hover,.kd-side a:hover{background:#eef3fc}
.kd-side button.on{background:#dceafe;color:var(--blue);font-weight:600}
.kd-side hr{border:0;border-top:1px solid var(--line);margin:8px 0;width:100%}
.kd-body{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;min-width:0}
.kd-full{grid-column:1/-1}
.kd-hero{background:linear-gradient(135deg,#1d4ed8,#38bdf8);color:#fff;border-radius:22px;padding:32px 36px}
.kd-hero h1{margin:2px 0 12px;font-size:34px}
.kd-pill{display:inline-block;background:rgba(255,255,255,.16);border-radius:999px;padding:5px 12px;font-size:12px;margin:0 6px 6px 0}
.kd-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px;max-width:560px}
.kd-3 div{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);border-radius:14px;padding:14px 6px;text-align:center}
.kd-3 b{display:block;font-size:22px}.kd-3 span{font-size:11px;opacity:.85}
.kd-link{border:0;color:#fff;border-radius:22px;padding:22px;text-align:left;display:flex;flex-direction:column;gap:22px;font-family:inherit;cursor:pointer;transition:transform .15s}
.kd-link:hover{transform:translateY(-3px)}
.kd-link .row{display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;gap:8px}
.kd-link h2{margin:0;font-size:22px}.kd-link p{margin:2px 0 0;font-size:14px;opacity:.9}
.kd-ico{width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:20px}
.kd-card{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden}
.kd-card>h3{margin:0;padding:18px 20px;font-size:18px;border-bottom:1px solid var(--line)}
.kd-card>.in{padding:20px}
.kd-stats5{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
.kd-stat{background:#fff;border:1px solid var(--line);border-radius:20px;padding:20px 10px;text-align:center}
.kd-stat .ic{width:44px;height:44px;border-radius:12px;margin:0 auto 8px;display:grid;place-items:center;font-size:20px}
.kd-stat b{display:block;font-size:24px}.kd-stat span{color:var(--mute);font-size:14px}
.kd-leg{margin:18px auto 0;max-width:260px;display:grid;gap:0}
.kd-leg div{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px}
.kd-leg i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px}
.kd-bar{height:12px;background:#e6eaf2;border-radius:99px;overflow:hidden;margin:8px 0 18px}
.kd-bar>div{height:100%;background:var(--blue);border-radius:99px;min-width:12px}
.kd-sub{display:flex;justify-content:space-between;font-weight:500}
.kd-trio{display:flex;justify-content:space-around;text-align:center;margin-top:14px}
.kd-trio b{font-size:22px;display:block}.kd-trio span{font-size:13px;color:var(--mute)}
.kd-empty{text-align:center;color:var(--mute);padding:40px 10px}
.kd-foot{text-align:center;color:var(--mute);font-size:13px;padding:10px 0 30px}
@media(max-width:1100px){.kd-stats5{grid-template-columns:repeat(3,1fr)}}
@media(max-width:860px){
  .kd-shell{grid-template-columns:1fr;gap:16px;padding:16px}
  .kd-side{position:static;display:flex;overflow-x:auto;gap:6px;padding:8px}
  .kd-side button,.kd-side a{width:auto;white-space:nowrap;padding:10px 14px}
  .kd-side hr{display:none}
  .kd-top{padding:10px 16px}.kd-inst{display:none}
  .kd-hero{padding:24px 20px}.kd-hero h1{font-size:28px}
  .kd-stats5{grid-template-columns:1fr 1fr}
}
`;

export const portalCss = css; // shared with the Parent portal (same look)

/* ---------- Small pieces ---------- */
function Ring({ value }) {
  const r = 90, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 220 220" width="200" height="200" style={{ display: "block", margin: "0 auto" }}>
      <circle cx="110" cy="110" r={r} fill="none" stroke="#e6eaf2" strokeWidth="12" />
      <circle cx="110" cy="110" r={r} fill="none" stroke="#2563eb" strokeWidth="12"
        strokeLinecap="round" strokeDasharray={`${(value / 100) * c + 18} ${c}`}
        transform="rotate(-90 110 110)" />
      <text x="110" y="118" textAnchor="middle" fontSize="38" fontWeight="700" fill="#0a2463">{value}%</text>
      <text x="110" y="142" textAnchor="middle" fontSize="14" fill="#8a94a6">Overall</text>
    </svg>
  );
}

function TrendChart({ data }) {
  const W = 320, H = 120, max = (Math.max(...data) || 1) * 1.2;
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * W, H - (v / max) * H]);
  const line = pts.map((p) => p.join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H + 6}`} width="100%" style={{ overflow: "visible" }}>
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="#2563eb" opacity=".08" />
      <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="#2563eb" />)}
    </svg>
  );
}

/* ---------- Screens ---------- */
function Home({ go, data }) {
  const { student, stats, trend, upcomingExams } = data;
  const latest = trend.length ? trend[trend.length - 1] : 0;
  return (
    <>
      <section className="kd-hero kd-full">
        <small>Good Afternoon</small>
        <h1>{student.name}</h1>
        <span className="kd-pill">🎓 {student.institute}</span>
        <span className="kd-pill">{student.batch}</span>
        <div className="kd-3">
          <div><b>{student.rank}</b><span>LATEST RANK</span></div>
          <div><b>{student.accuracy}%</b><span>ACCURACY</span></div>
          <div><b>{student.testsDone}</b><span>TESTS DONE</span></div>
        </div>
      </section>

      <button className="kd-link" style={{ background: "#1e3a8a" }} onClick={() => go("tests")}>
        <div className="kd-ico">📋</div>
        <div className="row"><div><h2>Assignments</h2><p>Tests, homework, classwork</p></div><span>{stats.pending === 0 ? "All caught up!" : `${stats.pending} pending`}</span></div>
      </button>
      <button className="kd-link" style={{ background: "#2563eb" }} onClick={() => go("analysis")}>
        <div className="kd-ico">📈</div>
        <div className="row"><div><h2>Analysis</h2><p>Performance &amp; analytics</p></div><span>{stats.completed} Reports · Latest: {latest.toFixed(0)}%</span></div>
      </button>
      <button className="kd-link" style={{ background: "#0369a1" }} onClick={() => go("review")}>
        <div className="kd-ico">📝</div>
        <div className="row"><div><h2>Review</h2><p>Solutions &amp; explanations</p></div><span>{stats.completed} Available</span></div>
      </button>

      <div className="kd-stats5 kd-full">
        {[["🔢", "#e0f0ff", stats.total, "Total Tests"], ["✅", "#dff7e6", stats.completed, "Completed"],
          ["⏳", "#fff1cc", stats.pending, "Pending"], ["❌", "#ffe0e0", stats.missed, "Missed"]].map(([ic, bg, n, l]) => (
          <div className="kd-stat" key={l}><div className="ic" style={{ background: bg }}>{ic}</div><b>{n}</b><span>{l}</span></div>
        ))}
        <div className="kd-stat"><div className="ic" style={{ background: "#dbeafe" }}>🎯</div><b>{stats.avgAccuracy ?? "--"}</b><span>Avg Accuracy</span></div>
      </div>

      <section className="kd-card kd-full">
        <h3>Exams</h3>
        {upcomingExams.length === 0 ? (
          <div className="kd-empty">📅<br />No upcoming exams scheduled</div>
        ) : (
          <div className="in">
            {upcomingExams.map((x) => <div className="kd-sub" key={x.id} style={{ padding: "8px 0" }}><span>📅 {x.name}</span><b>{x.date}</b></div>)}
          </div>
        )}
      </section>
    </>
  );
}

function Analysis({ data }) {
  const { stats, subjects, trend } = data;
  const latest = trend.length ? trend[trend.length - 1] : 0;
  const prev = trend.length > 1 ? trend[trend.length - 2] : latest;
  const diff = (latest - prev).toFixed(0);
  const mean = trend.length ? trend.reduce((a, b) => a + b, 0) / trend.length : 0;
  return (
    <>
      <section className="kd-card">
        <h3>Overall Performance</h3>
        <div className="in">
          <Ring value={stats.overall} />
          <div className="kd-leg">
            <div><span><i style={{ background: "#16a34a" }} />Correct</span><b style={{ color: "#16a34a" }}>{stats.correct}%</b></div>
            <div><span><i style={{ background: "#dc2626" }} />Incorrect</span><b style={{ color: "#dc2626" }}>{stats.incorrect}%</b></div>
            <div><span><i style={{ background: "#94a3b8" }} />Unattempted</span><b>{stats.unattempted}%</b></div>
            <div><span><i style={{ background: "#f59e0b" }} />Avg Time/Q</span><b>{stats.avgTime}</b></div>
          </div>
        </div>
      </section>

      <section className="kd-card">
        <h3>Subject Performance</h3>
        <div className="in">
          {subjects.map((s) => (
            <div key={s.name}>
              <div className="kd-sub"><span>{s.icon} {s.name}</span><b>{s.value}%</b></div>
              <div className="kd-bar"><div style={{ width: `${s.value}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="kd-card kd-full">
        <h3 style={{ display: "flex", justifyContent: "space-between" }}>Score Trend <small style={{ fontSize: 13, fontWeight: 500 }}>Last 10 Tests</small></h3>
        <div className="in">
          <TrendChart data={trend} />
          <div className="kd-trio">
            <div><b>{latest.toFixed(0)}%</b><span>Latest</span><div style={{ color: diff < 0 ? "#dc2626" : "#16a34a", fontSize: 13 }}>{diff < 0 ? "↓" : "↑"} {diff}%</div></div>
            <div><b>{mean.toFixed(1)}%</b><span>Average</span></div>
            <div><b>{trend.length ? Math.max(...trend) : 0}%</b><span>Best</span><div style={{ color: "#16a34a", fontSize: 13 }}>★ Best</div></div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------- App shell ---------- */
export default function StudentDashboard() {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [bell, setBell] = useState(null); // null = closed, else the list
  const [unread, setUnread] = useState(null); // null = use the number from the dashboard data
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { brand } = useBrand();

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await studentPortalService.getDashboard());
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const toggleBell = async () => {
    if (bell) { setBell(null); return; }
    try { const list = await studentNotificationService.list(); setBell(list); if (list.some((n) => !n.read)) { await studentNotificationService.markAllRead(); setUnread(0); } } catch { setBell([]); }
  };

  if (!data) {
    return (
      <div className="kd">
        <style>{css}</style>
        {error ? <ErrorState fullPage message={error} onRetry={load} /> : <LoadingState fullPage label="Loading your dashboard…" />}
      </div>
    );
  }
  const { student } = data;
  const nav = [["home", "🏠", "Dashboard"], ["profile", "👤", "Profile"], ["courses", "🎓", "My Courses"], ["tests", "📋", "Tests"], ["results", "🏆", "All Results"], ["mock", "📝", "Mock Tests"], ["materials", "📚", "View Notes"], ["attendance", "🗓️", "Mark Attendance"], ["messages", "💬", "Send Message"], ["analysis", "📈", "Analysis"], ["logout", "🚪", "Logout"]];

  return (
    <div className="kd">
      <style>{css}</style>
      <header className="kd-top">
        <Link to="/" className="kd-brand"><b>{brand.brandName.toUpperCase()}</b><small>STUDENT PORTAL</small></Link>
        <button className="kd-inst">🎓 {student.institute}</button>
        <Link to="/" className="kd-site">← Back to website</Link>
        <span style={{ position: "relative" }}>
          <button className="kd-ic" aria-label="Notifications" aria-expanded={Boolean(bell)} onClick={toggleBell}>🔔{(unread ?? data.unreadNotifications) > 0 && <span className="kd-badge">{unread ?? data.unreadNotifications}</span>}</button>
          {bell && (
            <div className="kd-pop" role="menu">
              <b>Notifications</b>
              {!bell.length ? <p>You're all caught up.</p> : <ul>{bell.slice(0, 15).map((n) => <li key={n.id} className={n.read ? "" : "new"}>{n.text}<small>{new Date(n.createdOn).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small></li>)}</ul>}
            </div>
          )}
        </span>
        <button className="kd-av" aria-label="Profile" onClick={() => setTab("profile")}>{student.name[0]}</button>
      </header>

      <div className="kd-shell">
        <nav className="kd-side" aria-label="Student menu">
          {nav.filter(([id]) => id !== "logout").map(([id, e, l]) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}><span>{e}</span>{l}</button>
          ))}
          <hr />
          <Link to="/"><span>🌐</span>Back to website</Link>
          <button onClick={() => { logout(); navigate("/login", { replace: true }); }}><span>🚪</span>Logout</button>
        </nav>

        <div>
          <main className="kd-body">
            {tab === "home" && <Home go={setTab} data={data} />}
            {tab === "analysis" && <Analysis data={data} />}
            {tab === "courses" && <StudentCourses goTests={() => setTab("tests")} />}
            {tab === "tests" && <StudentExams />}
            {tab === "materials" && <StudentMaterials />}
            {tab === "attendance" && <StudentAttendance />}
            {tab === "profile" && <StudentProfile />}
            {tab === "results" && <StudentResults />}
            {tab === "mock" && <StudentMockTests />}
            {tab === "messages" && <StudentMessages />}
            {tab === "review" && <StudentResults />}
          </main>
          <div className="kd-foot">{brand.instituteName}{brand.city ? ` • ${brand.city}` : ""}</div>
        </div>
      </div>
    </div>
  );
}
