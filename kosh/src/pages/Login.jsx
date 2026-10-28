import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ROLE_HOME, ROLE_LABEL, PORTALS } from "../auth/users";
import { env } from "../config/env";
import { DEMO_ACCOUNTS } from "../mocks/demoAccounts";

export default function Login({ portal }) {
  const P = portal ? PORTALS[portal] : null; // set on /admin-login, /student-login, /parent-login, /staff-login
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ id: "", pw: "" });
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const idRef = useRef(null);

  useEffect(() => { idRef.current?.focus(); }, []);

  // already signed in -> straight to the right dashboard
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const errs = {};
  const id = form.id.trim();
  if (!id) errs.id = "Enter your email or username.";
  else if (id.includes("@") ? !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(id) : id.length < 3) errs.id = id.includes("@") ? "Enter a valid email address." : "Username must be at least 3 characters.";
  if (!form.pw) errs.pw = "Enter your password.";
  else if (form.pw.length < 6) errs.pw = "Password must be at least 6 characters.";

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(""); };
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ id: true, pw: true });
    if (errs.id || errs.pw || busy) return;
    setBusy(true);
    const res = await login(form.id, form.pw);
    setBusy(false);
    if (!res.ok) { setError(res.error); setForm((f) => ({ ...f, pw: "" })); return; }
    if (P && !P.roles.includes(res.user.role)) {
      logout();
      setError(`This is the ${P.label} login. This account belongs to ${ROLE_LABEL[res.user.role]} — please use the ${ROLE_LABEL[res.user.role]} login page.`);
      setForm((f) => ({ ...f, pw: "" }));
      return;
    }
    // admin -> /dashboard, student -> /student-dashboard (go back to the page they wanted if it matches their role)
    const from = location.state?.from;
    const ok = from?.startsWith(ROLE_HOME[res.user.role] || "/__none__");
    navigate(ok ? from : ROLE_HOME[res.user.role], { replace: true });
  };

  return (
    <section className="kw-login-page">
      <div className="kw-wrap">
        <form className="kw-login-card" onSubmit={submit} noValidate>
          <div className="kw-login-ic" aria-hidden="true">{P ? P.icon : "🔐"}</div>
          <h1>{P ? `${P.label} Login` : "Login"}</h1>
          <p className="kw-login-sub">{P ? P.sub : "Sign in with your email/username and password. You will be taken to your own dashboard automatically."}</p>

          {error && <div className="kw-login-err" role="alert">{error}</div>}

          <label className="kw-lf">
            <span>Email or username</span>
            <input ref={idRef} type="text" autoComplete="username" autoCapitalize="none" spellCheck="false"
              value={form.id} onChange={set("id")} onBlur={blur("id")} placeholder="you@example.com"
              aria-invalid={Boolean(touched.id && errs.id)} aria-describedby="e-id" />
            <small id="e-id" className="kw-lf-err">{touched.id && errs.id}</small>
          </label>

          <label className="kw-lf">
            <span>Password</span>
            <div className="kw-pw">
              <input type={show ? "text" : "password"} autoComplete="current-password"
                value={form.pw} onChange={set("pw")} onBlur={blur("pw")} placeholder="Enter your password"
                aria-invalid={Boolean(touched.pw && errs.pw)} aria-describedby="e-pw" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
            </div>
            <small id="e-pw" className="kw-lf-err">{touched.pw && errs.pw}</small>
          </label>

          <button className="kw-btn lg kw-login-submit" disabled={busy}>{busy ? "Signing in…" : "Login"}</button>

          {env.USE_MOCK && <div className="kw-login-demo">
            <b>Demo accounts</b>
            {DEMO_ACCOUNTS.filter((u) => !P || P.roles.includes(u.role)).map((u) => (
              <button key={u.id} type="button" className="kw-login-fill"
                onClick={() => { setForm({ id: u.email, pw: u.password }); setError(""); setTouched({}); }}>
                {ROLE_LABEL[u.role]}: {u.email} / {u.password} — tap to fill
              </button>
            ))}
          </div>}

          <div className="kw-login-links" style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center" }}>
            {Object.entries(PORTALS).filter(([k]) => k !== portal).map(([k, p]) => <Link key={k} to={p.path}>{p.label} login</Link>)}
            <Link to="/">← Back to website</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
