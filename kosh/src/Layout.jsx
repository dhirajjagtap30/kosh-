import { useBrand } from "./branding/BrandContext";
import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { useReveal, ScrollProgress } from "./effects/useReveal";
import "./kosh.css";

export default function Layout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  useReveal(pathname);

  const { brand } = useBrand();
  return (
    <div className="kw">
      <ScrollProgress />
      <Navbar />
      <main className="kw-main" key={pathname}><Outlet /></main>
      {!["/contact", "/", "/login", "/register", "/enquiries"].includes(pathname) && (
        <section className="kw-cta-band"><div className="kw-wrap">
          <div><h3>Ready to see {brand.brandName} in action?</h3><p>Book a personal demo for your institute.</p></div>
          <Link to="/contact" className="kw-btn lg">Book a demo</Link>
        </div></section>
      )}
      <footer className="kw-foot">
        <div className="kw-wrap kw-foot-grid">
          <div>
            <Link to="/" className="kw-brand"><b>{brand.brandName.toUpperCase()}</b></Link>
            <p>Online test management and performance analysis for JEE, NEET and MHT-CET coaching institutes.</p>
          </div>
          <div><h5>Product</h5>
            <Link to="/features">Features</Link><Link to="/how-it-works">How it works</Link><Link to="/analytics">Analytics</Link><Link to="/reports">Reports</Link><Link to="/faq">FAQ</Link></div>
          <div><h5>Panels</h5>
            <Link to="/admin">Admin</Link><Link to="/teacher">Teacher</Link><Link to="/student">Student</Link><Link to="/exam-flow">Exam flow</Link></div>
          <div><h5>Account</h5>
            <Link to="/login">Login</Link><Link to="/contact">Book a demo</Link></div>
        </div>
        <div className="kw-foot-bottom"><div className="kw-wrap">© {new Date().getFullYear()} {brand.instituteName}{brand.city ? ` • ${brand.city}` : ""}</div></div>
      </footer>
    </div>
  );
}
