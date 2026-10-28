import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ROLE_HOME } from "../auth/users";
import { useBrand } from "../branding/BrandContext";
import { authService } from "../services";
import { EXAM_TARGETS, needsTarget } from "../dashboard/data";
import "./register.css";

const STANDARDS = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "Dropper / Repeater"];
const MEDIUMS = ["Marathi", "English", "Semi-English", "Hindi"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\d{10}$/;
const EMPTY = { branchId: "", name: "", mobile: "", standard: "", target: "", medium: "", dob: "", email: "", parentName: "", parentMobile: "", school: "", username: "", password: "", confirm: "" };
const today = () => new Date().toISOString().slice(0, 10);

function validate(f) {
  const e = {};
  if (!f.branchId) e.branchId = "Select your branch.";
  if (!f.name.trim()) e.name = "Enter the student's full name.";
  if (!PHONE.test(f.mobile)) e.mobile = "Contact number must be 10 digits.";
  if (!f.standard) e.standard = "Select the standard.";
  if (needsTarget(f.standard) && !f.target) e.target = "Select the exam you are preparing for.";
  if (!f.medium) e.medium = "Select the medium.";
  if (!f.dob) e.dob = "Select the date of birth.";
  else if (f.dob > today()) e.dob = "Date of birth cannot be in the future.";
  if (!EMAIL.test(f.email.trim())) e.email = "Enter a valid email address.";
  if (!f.parentName.trim()) e.parentName = "Enter the parent's name.";
  if (!PHONE.test(f.parentMobile)) e.parentMobile = "Parent contact number must be 10 digits.";
  if (!f.school.trim()) e.school = "Enter the college / school name.";
  if (f.username.trim().length < 3) e.username = "ID must be at least 3 characters.";
  else if (/\s/.test(f.username.trim())) e.username = "ID cannot contain spaces.";
  if (f.password.length < 6) e.password = "Password must be at least 6 characters.";
  if (f.confirm !== f.password) e.confirm = "Passwords do not match.";
  return e;
}

export default function Register() {
  const { user } = useAuth();
  const { brand, branches } = useBrand();
  const [f, setF] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const bid = f.branchId || (brand.id ? String(brand.id) : "");
  const errs = validate({ ...f, branchId: bid });
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value, ...(k === "standard" && !needsTarget(e.target.value) ? { target: "" } : {}) }); setError(""); };
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    if (Object.keys(errs).length || busy) return;
    setBusy(true);
    const res = await authService.register({ ...f, branchId: Number(bid) });
    setBusy(false);
    if (res.ok) { setDone(true); window.scrollTo(0, 0); } else setError(res.error);
  };

  const field = (k, label, props = {}, full = false) => (
    <label className={`kw-lf${full ? " full" : ""}`}>
      <span>{label}</span>
      <input value={f[k]} onChange={set(k)} onBlur={blur(k)} aria-invalid={Boolean(touched[k] && errs[k])} {...props} />
      <small className="kw-lf-err">{touched[k] && errs[k]}</small>
    </label>
  );
  const pick = (k, label, options, placeholder) => (
    <label className="kw-lf">
      <span>{label}</span>
      <select value={f[k]} onChange={set(k)} onBlur={blur(k)} aria-invalid={Boolean(touched[k] && errs[k])}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <small className="kw-lf-err">{touched[k] && errs[k]}</small>
    </label>
  );

  return (
    <section className="kw-login-page">
      <div className="kw-wrap">
        <form className="kw-login-card wide" onSubmit={submit} noValidate>
          <div className="kw-login-ic" aria-hidden="true">📝</div>
          <h1>Student Registration</h1>
          {done ? (
            <>
              <div className="kw-ok" role="status" style={{ margin: "14px 0" }}>Registration successful! Log in with your ID <b>{f.username.trim()}</b> and password.</div>
              <Link to="/login" className="kw-btn lg kw-login-submit">Go to Login</Link>
            </>
          ) : (
            <>
              <p className="kw-login-sub">Fill in the student's details to create an account. Staff / trainer accounts are created by the institute admin.</p>
              {error && <div className="kw-login-err" role="alert">{error}</div>}
              <div className="kw-reg-grid">
                <div className="kw-reg-sec">Branch</div>
                <label className="kw-lf full">
                  <span>Your branch</span>
                  <select value={bid} onChange={set("branchId")} onBlur={blur("branchId")} disabled={Boolean(brand.id)} aria-invalid={Boolean(touched.branchId && errs.branchId)}>
                    <option value="">Select branch</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <small className="kw-lf-err">{touched.branchId && errs.branchId}</small>
                </label>
                <div className="kw-reg-sec">Student details</div>
                {field("name", "Student name", { autoComplete: "name", placeholder: "Full name" })}
                {field("mobile", "Contact number", { inputMode: "numeric", maxLength: 10, autoComplete: "tel", placeholder: "10-digit mobile" })}
                {pick("standard", "Standard", STANDARDS, "Select standard")}
                {needsTarget(f.standard) && pick("target", "Exam target (JEE / NEET / MHT-CET)", EXAM_TARGETS, "Select exam target")}
                {pick("medium", "Medium", MEDIUMS, "Select medium")}
                {field("dob", "Date of birth", { type: "date", max: today(), autoComplete: "bday" })}
                {field("email", "Email ID", { type: "email", autoComplete: "email", placeholder: "you@example.com" })}
                {field("school", "College / School name", { placeholder: "College or school name" }, true)}

                <div className="kw-reg-sec">Parent details</div>
                {field("parentName", "Parent name", { placeholder: "Parent / guardian name" })}
                {field("parentMobile", "Parent contact number", { inputMode: "numeric", maxLength: 10, placeholder: "10-digit mobile" })}

                <div className="kw-reg-sec">Login details</div>
                {field("username", "ID (username)", { autoComplete: "username", autoCapitalize: "none", spellCheck: "false", placeholder: "Choose your login ID" }, true)}
                {field("password", "Password", { type: "password", autoComplete: "new-password", placeholder: "At least 6 characters" })}
                {field("confirm", "Confirm password", { type: "password", autoComplete: "new-password", placeholder: "Re-enter password" })}
              </div>
              <button className="kw-btn lg kw-login-submit" disabled={busy}>{busy ? "Creating account…" : "Register"}</button>
              <div className="kw-login-links">Already have an account? <Link to="/login">Login</Link></div>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
