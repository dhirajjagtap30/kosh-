import { useState } from "react";
import { Link } from "react-router-dom";
import { flow } from "../data";
import { FeaturesSection, HowSection, AnalyticsSection, ReportsSection, FaqSection } from "../sections";
import { DemoForm } from "../shared";
import Icon from "../effects/icons";
import HeroBackground from "../effects/HeroBackground";

const ico = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", width: 16, height: 16, viewBox: "0 0 24 24", "aria-hidden": "true" };

/* Sign-in card shown in the hero: Institute / Student tabs, Google, e-mail. */
function HeroSignIn() {
  const [role, setRole] = useState("institute");
  const [note, setNote] = useState("");
  const isInst = role === "institute";
  return (
    <div className="kw-si-wrap">
    <div className="kw-float f1" aria-hidden="true"><Icon name="file" size={22} /><div><b>42</b>Tests</div></div>
    <div className="kw-float f2" aria-hidden="true"><Icon name="chart" size={22} /><div><b>68%</b>Avg score</div></div>
    <div className="kw-signin">
      <h2>Sign In</h2>
      <p className="kw-si-sub">Enter your credentials to continue</p>
      <div className="kw-si-tabs" role="tablist" aria-label="Sign in as">
        <button type="button" role="tab" aria-selected={isInst} className={isInst ? "on" : ""} onClick={() => { setRole("institute"); setNote(""); }}>
          <svg {...ico}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-4h4v4" /></svg>Institute
        </button>
        <button type="button" role="tab" aria-selected={!isInst} className={!isInst ? "on" : ""} onClick={() => { setRole("student"); setNote(""); }}>
          <svg {...ico}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>Student
        </button>
      </div>
      <button type="button" className="kw-si-google" onClick={() => setNote("Google sign-in will be available once the backend is connected.")}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
        Continue with Google
      </button>
      {note && <p className="kw-si-note" role="status">{note}</p>}
      <div className="kw-si-or"><span>OR</span></div>
      <Link to={isInst ? "/admin-login" : "/student-login"} className="kw-si-email">
        <svg {...ico}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>Sign in with Email
      </Link>
      <div className="kw-si-foot">Don't have an account? <Link to={isInst ? "/contact" : "/register"}>Create one</Link></div>
    </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="kw-hero">
        <HeroBackground />
        <div className="kw-wrap kw-hero-grid">
          <div>
            <span className="kw-eyebrow">For JEE • NEET • MHT-CET coaching institutes</span>
            <h1>Powerful online exams. Smarter student performance.</h1>
            <p>One complete platform for Test Management &amp; Performance Analysis, built for modern coaching institutes.</p>
            <div className="kw-chips">
              <span className="kw-chip"><Icon name="edit" size={16} />Smart Paper Generation</span>
              <span className="kw-chip"><Icon name="chart" size={16} />Advanced Analytics</span>
              <span className="kw-chip"><Icon name="target" size={16} />Exam-Pattern Tests</span>
            </div>
            <div className="kw-cta-row">
              <Link to="/contact" className="kw-btn lg">Book a personal demo</Link>
              <Link to="/login" className="kw-btn ghost lg">Login →</Link>
            </div>
          </div>
          <HeroSignIn />
        </div>
      </section>

      {/* QUICK DASHBOARD ACCESS */}
      <section className="kw-quick">
        <div className="kw-wrap kw-quick-grid one">
          <Link to="/login"><span className="qi"><Icon name="lock" size={28} /></span><div><h3>Login to your dashboard</h3><p>Admins and students sign in here — you are taken to your own dashboard</p></div><span className="go">Login →</span></Link>
        </div>
      </section>

      {/* STRIP */}
      <section className="kw-strip">
        <div className="kw-wrap kw-strip-grid">
          {[["4", "Test types", "DPP, Chapter, Mock, Final", "layers"], ["3", "Role-based panels", "Admin, Teacher, Student", "shield"], ["Excel", "Result export", "For records & planning", "sheet"], ["PTM", "Ready reports", "Student-wise, one click", "users"]].map(([n, t, d, ic]) => (
            <div key={t}><Icon name={ic} size={20} /><b>{n}</b><strong>{t}</strong><span>{d}</span></div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <FeaturesSection />

      {/* HOW IT WORKS */}
      <HowSection />

      {/* EXAM FLOW */}
      <section className="kw-sec dark" id="exam">
        <div className="kw-wrap">
          <div className="kw-center">
            <div className="kw-no">Exam-Pattern Testing</div>
            <h2>MHT-CET style exam flow</h2>
            <p className="sub" style={{ margin: "0 auto 8px" }}>Give students a realistic examination flow, not just a question paper.</p>
          </div>
          <div className="kw-flow">
            {flow.map((s, i) => <div className="kw-step" key={s}><i>{String(i + 1).padStart(2, "0")}</i>{s}</div>)}
          </div>
          <div className="kw-note"><b>MHT-CET style sectional flow</b>
            Physics → Chemistry → Submit → Mathematics unlocks
            <div><span className="bar">Custom Instructions • Flexible Timing • Additional Time</span></div></div>
        </div>
      </section>

      {/* ANALYTICS */}
      <AnalyticsSection />

      {/* REPORTS */}
      <ReportsSection />

      {/* LIVE DEMOS */}
      <section className="kw-sec">
        <div className="kw-wrap">
          <div className="kw-center">
            <div className="kw-no">Live preview</div>
            <h2>See the product yourself</h2>
            <p className="sub">Log in with a demo account to open the working dashboards.</p>
          </div>
          <div className="kw-demos one">
            <Link to="/login" className="kw-demo a"><span>Admin &amp; Student</span><h3>Login</h3><p>Separate logins for Admin, Student, Parent and Staff/Trainer — each opens its own dashboard.</p><b>Login →</b></Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* CTA */}
      <section className="kw-sec dark" id="demo">
        <div className="kw-wrap kw-center">
          <h2>Ready to upgrade your institute's testing system?</h2>
          <p className="sub" style={{ margin: "0 auto" }}>Experience the complete platform with a personal demonstration.</p>
          <DemoForm />
        </div>
      </section>
    </>
  );
}
