import { C, cta } from "../data";
import { DemoForm } from "../shared";
export default function Contact() {
  return (
    <section className="kw-sec"><div className="kw-wrap" style={{ textAlign: "center" }}>
      <h1 style={{ fontSize: "clamp(26px,3.6vw,40px)", margin: "0 0 6px", textTransform: "uppercase", lineHeight: 1.1 }}>Ready to upgrade your institute's testing system?</h1>
      <p className="sub" style={{ margin: "0 auto 28px" }}>Experience the complete platform with a personal demonstration.</p>
      <div className="kw-grid" style={{ textAlign: "left" }}>
        {cta.map(([t, d], i) => (
          <div key={t} className={`kw-card ${C[i] === "blue" ? "" : C[i]}`}><div className="ic" /><h4>{t}</h4><p>{d}</p></div>
        ))}
      </div>
      <DemoForm />
    </div></section>
  );
}
