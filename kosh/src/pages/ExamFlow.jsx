import { Head } from "../shared";
import { flow } from "../data";
export default function ExamFlow() {
  return (
    <section className="kw-sec dark"><div className="kw-wrap">
      <Head n="04 | Exam-Pattern Testing" title="MHT-CET style exam flow" sub="Give students a realistic examination flow, not just a question paper." />
      <div className="kw-flow">
        {flow.map((s, i) => <div className="kw-step" key={s}><i>{String(i + 1).padStart(2, "0")}</i>{s}</div>)}
      </div>
      <div className="kw-note"><b>MHT-CET style sectional flow</b>
        Physics → Chemistry → Submit → Mathematics unlocks
        <div><span className="bar">Custom Instructions • Flexible Timing • Additional Time</span></div></div>
    </div></section>
  );
}
