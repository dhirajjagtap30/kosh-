import { Link } from "react-router-dom";
import Icon from "./effects/icons";
import { C, admin, student, teacherStats, teacherInsights, analysisTiles, bars, reports } from "./data";

const steps = [
  ["Create the paper", "Build question papers from your laptop or mobile in minutes."],
  ["Assign to batches", "Send the test to a Batch, Branch or Division with the timing you set."],
  ["Students take the exam", "A realistic exam-pattern interface, with sectional flow if you need it."],
  ["Analyse & report", "Ranks, graphs and student-wise reports are ready the moment the test ends."],
];

const faqs = [
  ["Which exams is Sahyadri built for?", "JEE, NEET and MHT-CET. You can run DPPs, chapter-wise tests, mock tests and final tests."],
  ["Can teachers and admins have separate access?", "Yes. Admins, teachers and students each get their own panel with their own permissions."],
  ["Can I control when students see solutions?", "Yes. Solutions are released separately, according to your plan."],
  ["Does it work on mobile too?", "Yes. The website adapts to phones and tablets, but it is designed first for a laptop or desktop screen."],
  ["How do I see it in action?", "Book a personal demo. We will walk through the complete workflow live."],
];

function Feature({ id, tag, title, text, points, flip, children }) {
  return (
    <div className={`kw-feature${flip ? " flip" : ""}`} id={id}>
      <div>
        <span className="kw-tag">{tag}</span>
        <h3>{title}</h3>
        <p className="sub">{text}</p>
        <ul className="kw-list">{points.map(([t, d]) => <li key={t}><span><b>{t}</b>{d && <> — {d}</>}</span></li>)}</ul>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function FeaturesSection() {
  return (
      <section className="kw-sec" id="features">
        <div className="kw-wrap">
          <div className="kw-center">
            <div className="kw-no">Features</div>
            <h2>Everything your institute needs</h2>
            <p className="sub">Three connected panels — so admins, teachers and students all work from the same data.</p>
          </div>

          <Feature id="admin" tag="01 · Admin Panel" title="Create & manage tests smarter"
            text="Powerful admin controls for your complete testing workflow." points={admin}>
            <div className="kw-panel kw-mini">
              <h4>New test</h4>
              {[["Test type", "Mock Test"], ["Assign to", "Batch A · Division 2"], ["Duration", "3 hours + 15 min extra"], ["Solutions", "Release after review"]].map(([k, v]) => (
                <div className="kw-field" key={k}><span>{k}</span><b>{v}</b></div>
              ))}
              <span className="kw-btn sm">Publish test</span>
            </div>
          </Feature>

          <Feature id="teacher" flip tag="02 · Teacher Dashboard" title="A dashboard that shows what matters"
            text="Get a quick academic snapshot and identify where attention is needed."
            points={teacherInsights.map((t) => [t])}>
            <div className="kw-panel"><div className="kw-stats">
              {teacherStats.map(([n, l], i) => (
                <div className="kw-stat" key={l}><b style={{ color: ["#1d4ed8", "#0369a1", "#1e3a8a", "#1d4ed8"][i] }}>{n}</b><span>{l}</span></div>
              ))}
            </div></div>
          </Feature>

          <Feature id="student" tag="03 · Student Panel" title="Keep every student on track"
            text="A personalized student dashboard for tests and progress." points={student}>
            <div className="kw-panel kw-mini">
              <h4>Hello, Abhijeet</h4>
              <div className="kw-stats">
                {[["#1", "Latest rank"], ["2", "Tests done"], ["0", "Pending"], ["0", "Missed"]].map(([n, l], i) => (
                  <div className="kw-stat" key={l}><b style={{ color: ["#1d4ed8", "#0369a1", "#1e3a8a", "#1d4ed8"][i] }}>{n}</b><span>{l}</span></div>
                ))}
              </div>
              <Link to="/student-dashboard" className="kw-btn dark sm">Open student dashboard</Link>
            </div>
          </Feature>
        </div>
      </section>
  );
}

export function HowSection() {
  return (
      <section className="kw-sec white" id="how">
        <div className="kw-wrap">
          <div className="kw-center">
            <div className="kw-no">How it works</div>
            <h2>From question paper to parent meeting</h2>
            <p className="sub">Four simple steps, no complicated setup.</p>
          </div>
          <div className="kw-steps">
            {steps.map(([t, d], i) => (
              <div className="kw-stepcard" key={t}>
                <span className="kw-stepno">0{i + 1}</span><i className={C[i % 3]}><Icon name={["file", "users", "target", "chart"][i % 4]} size={22} /></i><h4>{t}</h4><p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
  );
}

export function AnalyticsSection() {
  return (
      <section className="kw-sec" id="analytics">
        <div className="kw-wrap">
          <div className="kw-center">
            <div className="kw-no">Results &amp; Performance Analysis</div>
            <h2>Don't stop at marks. Analyse.</h2>
            <p className="sub">Turn every test into actionable academic intelligence.</p>
          </div>
          <div className="kw-split">
            <div className="kw-panel"><h4 style={{ margin: "0 0 8px" }}>Performance Trend</h4>
              <div className="kw-chart">
                {bars.map((h, i) => <div key={i} style={{ height: `${h}%`, background: ["#2563eb", "#0ea5e9", "#38bdf8"][i % 3] }} />)}
              </div></div>
            <div className="kw-tiles">{analysisTiles.map((t) => <div className="kw-tile" key={t}>{t}</div>)}</div>
          </div>
        </div>
      </section>
  );
}

export function ReportsSection() {
  return (
      <section className="kw-sec white" id="reports">
        <div className="kw-wrap">
          <div className="kw-center">
            <div className="kw-no">Reports, Excel &amp; Parent Meetings</div>
            <h2>Reports that help in PTMs</h2>
            <p className="sub">Make academic discussions more structured with student-level data.</p>
          </div>
          <div className="kw-grid">
            {reports.map(([t, d], i) => (
              <div key={t} className={`kw-card ${C[i % 3] === "blue" ? "" : C[i % 3]}`}><div className="ic"><Icon name={["trophy", "sheet", "users"][i % 3]} size={20} /></div><h4>{t}</h4><p>{d}</p></div>
            ))}
          </div>
          <div className="kw-banner">DATA → INSIGHT → ACTION</div>
        </div>
      </section>
  );
}

export function FaqSection() {
  return (
      <section className="kw-sec white" id="faq">
        <div className="kw-wrap kw-narrow">
          <div className="kw-center"><div className="kw-no">FAQ</div><h2>Common questions</h2></div>
          <div className="kw-faq">
            {faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>
  );
}

