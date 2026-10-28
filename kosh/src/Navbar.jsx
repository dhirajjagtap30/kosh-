import { BrandLogo, useBrand } from "./branding/BrandContext";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { ROLE_HOME, ROLE_LABEL } from "./auth/users";
import "./header.css";

export const navLinks = [
  ["/", "Home"],
  ["/about", "About"],
  ["/features", "Features"],
  ["/contact", "Contact"],
  ["/login", "Login", "guest"],
  ["/register", "Registration", "guest"],
  ["/enquiries", "Enquiries"],
];

function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, []);
  const first = (user.name || "User").split(" ")[0];
  return (
    <div className="kw-user" ref={ref}>
      <button type="button" className="kw-user-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="kw-user-av">{first[0].toUpperCase()}</span>
        <span className="kw-user-name">{first}</span>
        <span className="kw-user-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="kw-user-pop" role="menu">
          <div className="kw-user-head"><b>{user.name}</b><small>{user.email} · {ROLE_LABEL[user.role] || "User"}</small></div>
          <Link role="menuitem" to={ROLE_HOME[user.role]}>🏠 My Dashboard</Link>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); logout(); navigate("/", { replace: true }); }}>🚪 Logout</button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { brand } = useBrand();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="kw-nav">
      <div className="kw-wrap">
        <Link to="/" className="kw-brandrow" aria-label="Home">
          <BrandLogo size={54} />
          <span className="kw-brand"><b>{brand.brandName.toUpperCase()}</b><small>{brand.tagline}</small></span>
        </Link>

        <nav id="kw-menu" className={`kw-links${open ? " open" : ""}`} aria-label="Main">
          {navLinks.filter(([, , only]) => !(only === "guest" && user)).map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>{label}</NavLink>
          ))}
        </nav>

        <div className="kw-actions">
          {user && <UserMenu user={user} logout={logout} />}
          <Link to="/contact" className="kw-btn">Book a demo</Link>
          <button className="kw-burger" aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open} aria-controls="kw-menu" onClick={() => setOpen((o) => !o)}>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
    </header>
  );
}
