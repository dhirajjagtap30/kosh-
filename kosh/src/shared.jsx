import { useState } from "react";
import "./components/status-views.css";
import { C, cta } from "./data";
import { leadService, getErrorMessage } from "./services";

export const Cards = ({ items }) => (
  <div className="kw-grid">
    {items.map(([t, d], i) => (
      <div key={t} className={`kw-card ${C[i % 3] === "blue" ? "" : C[i % 3]}`}>
        <div className="ic" /><h4>{t}</h4><p>{d}</p>
      </div>
    ))}
  </div>
);

export const Head = ({ n, title, sub }) => (
  <>
    <div className="kw-no">{n}</div>
    <h1 style={{ fontSize: "clamp(26px,3.6vw,40px)", margin: "0 0 6px", textTransform: "uppercase", lineHeight: 1.1 }}>{title}</h1>
    <p className="sub">{sub}</p>
  </>
);

export function DemoForm() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({ name: "", inst: "", phone: "", need: "Personal Demo" });
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setError(""); };
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await leadService.submitDemoRequest({ name: f.name.trim(), institute: f.inst.trim(), phone: f.phone.trim(), need: f.need });
      setDone(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (done) return <div className="kw-form"><div className="kw-ok">Thank you, {f.name}! We will call you to schedule your demo.</div></div>;
  return (
    <div className="kw-form">
      <input placeholder="Your name" value={f.name} onChange={set("name")} />
      <input placeholder="Institute / coaching name" value={f.inst} onChange={set("inst")} />
      <input placeholder="Mobile number" value={f.phone} onChange={set("phone")} inputMode="tel" />
      <select value={f.need} onChange={set("need")}>
        {cta.map(([t]) => <option key={t}>{t}</option>)}
      </select>
      {error && <p className="api-field-err" role="alert">{error}</p>}
      <button className="kw-btn" disabled={!f.name || !f.phone || busy} onClick={submit}>
        {busy ? "Sending…" : "Schedule my demo"}
      </button>
    </div>
  );
}
