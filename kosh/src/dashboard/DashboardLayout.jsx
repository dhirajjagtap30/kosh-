import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { DashboardProvider, useDashboard } from "./store";
import { useAuth } from "../auth/AuthContext";
import { BrandLogo, useBrand } from "../branding/BrandContext";
import { getViewBranch, setViewBranch } from "../branding/viewBranch";
import { ErrorBanner } from "../components/StatusViews";
import "./dashboard.css";

const items = [
  ["/dashboard/branches", "🏢", "Branches & Brands", false, "superadmin"],
  ["/dashboard", "🏠", "Overview", true],
  ["/dashboard/tests", "📋", "Tests"],
  ["/dashboard/registrations", "📝", "Registrations"],
  ["/dashboard/students", "🎓", "Students"],
  ["/dashboard/staff", "👥", "Staff & Trainers", false, "admin"],
  ["/dashboard/parents", "👨‍👩‍👧", "Parents", false, "admin"],
  ["/dashboard/questions", "❓", "Question Bank"],
  ["/dashboard/papers", "🗂️", "Question Papers"],
  ["/dashboard/batches", "👪", "Batches"],
  ["/dashboard/attendance", "🗓️", "Attendance"],
  ["/dashboard/notify", "🔔", "Send Notification"],
  ["/dashboard/messages", "💬", "Messages"],
  ["/dashboard/notices", "📢", "Notices"],
  ["/dashboard/courses", "🖥️", "LMS Courses"],
  ["/dashboard/materials", "📚", "Study Material"],
  ["/dashboard/analysis", "📈", "Analysis"],
  ["/dashboard/reports", "📄", "Reports"],
  ["/dashboard/teacher-reports", "🧾", "Batch & Attendance Reports"],
  ["/dashboard/reg-reports", "📊", "Registration Reports"],
  ["/dashboard/settings", "⚙️", "Settings"],
];

/* Menu for staff / trainer logins (the Teacher panel): only what a teacher needs, in the order they work. */
const teacherItems = [
  ["/dashboard", "🏠", "Home", true],
  ["/dashboard/batches", "👪", "Batches & Students"],
  ["/dashboard/tests", "📋", "Assign Test"],
  ["/dashboard/papers", "🗂️", "Question Papers"],
  ["/dashboard/questions", "❓", "Question Bank"],
  ["/dashboard/materials", "📚", "Send Notes"],
  ["/dashboard/notify", "🔔", "Send Notification"],
  ["/dashboard/attendance", "🗓️", "Mark Attendance"],
  ["/dashboard/students", "🎓", "Students"],
  ["/dashboard/courses", "🖥️", "LMS Courses"],
  ["/dashboard/teacher-reports", "📄", "All Reports"],
  ["/dashboard/analysis", "📈", "Analysis"],
  ["/dashboard/messages", "💬", "Messages"],
  ["/dashboard/notices", "📢", "Notices"],
];

function Shell() {
  const { notifications, markAllRead, settings, actionError, clearActionError } = useDashboard();
  const [open, setOpen] = useState(false); // mobile / tablet drawer
  const [menu, setMenu] = useState(null); // "bell" | "user" | null
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout: signOut } = useAuth();
  const { brand, branches } = useBrand();
  const isSuper = Boolean(user && user.role === "superadmin");
  const isTeacher = Boolean(user && (user.role === "staff" || user.role === "trainer"));
  const viewing = getViewBranch();
  const switchBranch = (e) => { setViewBranch(Number(e.target.value)); window.location.assign("/dashboard"); };
  const rightRef = useRef(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    setOpen(false);
    setMenu(null);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMenu(null);
      }
    };
    const onDown = (e) => {
      if (rightRef.current && !rightRef.current.contains(e.target)) setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const logout = () => { signOut(); navigate("/login", { replace: true }); };

  return (
    <div className="kw db">
      <header className="db-top">
        <button type="button" className="db-burger" aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open} aria-controls="db-side" onClick={() => setOpen((o) => !o)}>
          {open ? "✕" : "☰"}
        </button>
        <Link to="/dashboard" className="kw-brandrow" style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 10, color: "#fff" }}><BrandLogo size={36} /><span className="kw-brand"><b>{brand.brandName.toUpperCase()}</b><small>{isSuper ? "SUPER ADMIN PANEL" : isTeacher ? "TEACHER PANEL" : brand.city ? `${brand.city.toUpperCase()} BRANCH PANEL` : "INSTITUTE DASHBOARD"}</small></span></Link>
        {isSuper && (
          <select className="db-branch-switch" aria-label="Branch" value={viewing} onChange={switchBranch}>
            <option value={0}>All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        <div className="db-top-right" ref={rightRef}>
          <div className="db-menu">
            <button type="button" className="db-ic" aria-label="Notifications" aria-expanded={menu === "bell"}
              onClick={() => setMenu(menu === "bell" ? null : "bell")}>
              🔔{unread > 0 && <span className="db-badge">{unread}</span>}
            </button>
            {menu === "bell" && (
              <div className="db-pop" role="menu">
                <div className="db-pop-head">
                  <b>Notifications</b>
                  <button type="button" className="db-link-btn" onClick={markAllRead} disabled={unread === 0}>Mark all read</button>
                </div>
                {notifications.length === 0 ? (
                  <p className="db-muted" style={{ padding: 12 }}>You're all caught up.</p>
                ) : (
                  <ul className="db-notes">
                    {notifications.map((n) => (
                      <li key={n.id} className={n.read ? "" : "unread"}>{n.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="db-menu">
            <button type="button" className="db-avatar" aria-label="Account menu" aria-expanded={menu === "user"}
              onClick={() => setMenu(menu === "user" ? null : "user")}>
              {(settings.institute || "A").trim()[0].toUpperCase()}
            </button>
            {menu === "user" && (
              <div className="db-pop small" role="menu">
                <div className="db-pop-head"><b>{settings.institute}</b></div>
                {!isTeacher && <Link className="db-pop-item" to="/dashboard/settings">Settings</Link>}
                <Link className="db-pop-item" to="/">Back to website</Link>
                <button type="button" className="db-pop-item" onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="db-body">
        <aside id="db-side" className={`db-side${open ? " open" : ""}`} aria-label="Dashboard menu">
          <nav>
            {(isTeacher ? teacherItems : items.filter((it) => !it[4] || it[4] === (user && user.role) || (it[4] === "admin" && isSuper))).map(([to, icon, label, end]) => (
              <NavLink key={to} to={to} end={Boolean(end)} className={({ isActive }) => `db-link${isActive ? " active" : ""}`}>
                <span aria-hidden="true">{icon}</span>{label}
              </NavLink>
            ))}
          </nav>
          <div className="db-side-foot">
            <Link to="/" className="db-link"><span aria-hidden="true">🌐</span>Back to website</Link>
            <button type="button" className="db-link" onClick={logout}><span aria-hidden="true">🚪</span>Logout</button>
          </div>
        </aside>
        <div className={`db-overlay${open ? " show" : ""}`} onClick={() => setOpen(false)} />

        <main className="db-main">
          <ErrorBanner message={actionError} onClose={clearActionError} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <DashboardProvider>
      <Shell />
    </DashboardProvider>
  );
}
