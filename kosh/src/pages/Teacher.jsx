import { Head } from "../shared";
import { teacherStats, teacherInsights } from "../data";
export default function Teacher() {
  return (
    <section className="kw-sec white"><div className="kw-wrap">
      <Head n="02 | Teacher Dashboard" title="Teacher dashboard that shows what matters" sub="Get a quick academic snapshot and identify where attention is needed." />
      <div className="kw-split">
        <div className="kw-panel"><div className="kw-stats">
          {teacherStats.map(([n, l], i) => (
            <div className="kw-stat" key={l}><b style={{ color: ["#1d4ed8", "#0369a1", "#1e3a8a", "#1d4ed8"][i] }}>{n}</b><span>{l}</span></div>
          ))}
        </div></div>
        <div><h3 style={{ marginTop: 0 }}>Teacher insights</h3>
          <ul className="kw-list">{teacherInsights.map((t) => <li key={t}>{t}</li>)}</ul></div>
      </div>
    </div></section>
  );
}
