import { Link } from "react-router-dom";
import { Head } from "../shared";

const points = [
  ["Built for coaching institutes", "Sahyadri Easy Coaching helps JEE, NEET and MHT-CET institutes run online tests and understand student performance."],
  ["Test management", "Create DPP, Chapter-wise, Mock and Final tests, assign them by batch and control timing and solutions."],
  ["Performance analysis", "Rank, subject-wise and trend analysis after every test, with Excel/CSV and parent-teacher reports."],
];

export default function About() {
  return (
    <section className="kw-sec"><div className="kw-wrap">
      <Head n="About us" title="About Sahyadri Easy Coaching" sub="One platform for online exams and smarter student performance." />
      <div className="kw-grid" style={{ marginTop: 24 }}>
        {points.map(([t, d], i) => (
          <div key={t} className={`kw-card ${["", "teal", "orange"][i]}`}><div className="ic" /><h4>{t}</h4><p>{d}</p></div>
        ))}
      </div>
      <div style={{ marginTop: 28 }}><Link to="/contact" className="kw-btn lg">Book a personal demo</Link></div>
    </div></section>
  );
}
