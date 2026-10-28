import { useState } from "react";
import { Head } from "../shared";
import { enquiryService, getErrorMessage } from "../services";
import "../components/status-views.css";

const TOPICS = ["General enquiry", "Pricing", "Demo request", "Technical support"];

export default function Enquiries() {
  const [f, setF] = useState({ name: "", email: "", mobile: "", topic: TOPICS[0], message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await enquiryService.submit({ ...f, name: f.name.trim(), message: f.message.trim() });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="kw-sec"><div className="kw-wrap" style={{ textAlign: "center" }}>
      <Head n="Enquiries" title="Send us an enquiry" sub="Tell us what you need and our team will get back to you." />
      {done ? (
        <div className="kw-form"><div className="kw-ok">Thank you, {f.name}! We have received your enquiry.</div></div>
      ) : (
        <form className="kw-form" onSubmit={submit}>
          <input placeholder="Your name" value={f.name} onChange={set("name")} />
          <input placeholder="Email (optional)" type="email" value={f.email} onChange={set("email")} />
          <input placeholder="Mobile number" inputMode="tel" value={f.mobile} onChange={set("mobile")} />
          <select value={f.topic} onChange={set("topic")}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
          <textarea placeholder="Your message" rows={4} value={f.message} onChange={set("message")}
            style={{ padding: "13px 14px", borderRadius: 10, border: "1px solid #cdd6e6", font: "15px inherit", fontFamily: "inherit", width: "100%", resize: "vertical" }} />
          {error && <p className="api-field-err" role="alert">{error}</p>}
          <button className="kw-btn" disabled={!f.name.trim() || !f.message.trim() || busy}>{busy ? "Sending…" : "Send enquiry"}</button>
        </form>
      )}
    </div></section>
  );
}
