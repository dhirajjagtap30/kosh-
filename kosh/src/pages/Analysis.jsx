import { Head } from "../shared";
import { bars, analysisTiles } from "../data";
export default function Analysis() {
  return (
    <section className="kw-sec white"><div className="kw-wrap">
      <Head n="05 | Results & Performance Analysis" title="Don't stop at marks. Analyse." sub="Turn every test into actionable academic intelligence." />
      <div className="kw-split">
        <div className="kw-panel"><h4 style={{ margin: "0 0 8px" }}>Performance Trend</h4>
          <div className="kw-chart">
            {bars.map((h, i) => <div key={i} style={{ height: `${h}%`, background: ["#2563eb", "#0ea5e9", "#38bdf8"][i % 3] }} />)}
          </div></div>
        <div className="kw-tiles">{analysisTiles.map((t) => <div className="kw-tile" key={t}>{t}</div>)}</div>
      </div>
    </div></section>
  );
}
