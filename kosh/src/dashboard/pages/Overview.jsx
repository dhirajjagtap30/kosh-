import { Link, useNavigate } from "react-router-dom";
import { useDashboard } from "../store";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import { BarChart, ProgressBar } from "../components/Charts";
import { fmtDate, pct, tone } from "../utils";

export default function Overview() {
  const { overall, trend, subjectAvg, tests, students, studentStats, testStats, settings } = useDashboard();
  const navigate = useNavigate();

  const recent = [...tests]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
    .map((t) => ({ ...t, avg: testStats[t.id] ? testStats[t.id].avg : null }));
  const ranked = students.filter((s) => studentStats[s.id].avg !== null).sort((a, b) => studentStats[a.id].rank - studentStats[b.id].rank);
  const top = ranked.slice(0, 5);
  const low = [...ranked].reverse().filter((s) => studentStats[s.id].avg < settings.lowScoreBelow).slice(0, 5);

  const cols = [
    { key: "name", label: "Test", render: (r) => <Link to={`/dashboard/tests/${r.id}`}>{r.name}</Link> },
    { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
    { key: "batch", label: "Batch" },
    { key: "avg", label: "Avg", render: (r) => (r.avg == null ? "—" : <b className={`db-score ${tone(r.avg)}`}>{pct(r.avg)}</b>) },
    { key: "status", label: "Status", render: (r) => <span className={`db-badge-s ${r.status.toLowerCase()}`}>{r.status}</span> },
  ];

  return (
    <>
      <PageHeader title="Overview" sub={`Welcome back, ${settings.institute}.`}>
        <Link to="/dashboard/tests" state={{ create: true }} className="kw-btn">Create test</Link>
        <Link to="/dashboard/reports" className="kw-btn dark">Download reports</Link>
      </PageHeader>

      <div className="db-stats">
        <StatCard icon="🎓" label="Total students" value={overall.totalStudents} tone="blue" />
        <StatCard icon="✅" label="Tests conducted" value={overall.completed} tone="teal" />
        <StatCard icon="📊" label="Average score" value={pct(overall.avgScore)} tone="orange" />
        <StatCard icon="⏳" label="Upcoming / draft tests" value={overall.upcoming} tone="blue" />
      </div>

      <div className="db-cols">
        <section className="kw-panel">
          <h3>Performance trend</h3>
          <BarChart data={trend.slice(-7)} suffix="%" />
        </section>
        <section className="kw-panel">
          <h3>Subject performance</h3>
          {subjectAvg.map((s, i) => (
            <ProgressBar key={s.label} label={s.label} value={s.value} color={["#2563eb", "#0ea5e9", "#38bdf8"][i % 3]} />
          ))}
        </section>
      </div>

      <div className="db-cols">
        <section>
          <h3 className="db-sec-title">Recent tests</h3>
          <DataTable columns={cols} rows={recent} pageSize={6} onRowClick={(r) => navigate(`/dashboard/tests/${r.id}`)} />
        </section>
        <div className="db-stack">
          <section className="kw-panel">
            <h3>Top performers</h3>
            <ul className="db-list">
              {top.map((s) => (
                <li key={s.id}>
                  <Link to={`/dashboard/students/${s.id}`}>#{studentStats[s.id].rank} {s.name}</Link>
                  <b className={`db-score ${tone(studentStats[s.id].avg)}`}>{pct(studentStats[s.id].avg)}</b>
                </li>
              ))}
            </ul>
          </section>
          <section className="kw-panel">
            <h3>Needs attention</h3>
            {low.length === 0 ? (
              <p className="db-muted">No student is below {settings.lowScoreBelow}%.</p>
            ) : (
              <ul className="db-list">
                {low.map((s) => (
                  <li key={s.id}>
                    <Link to={`/dashboard/students/${s.id}`}>{s.name}</Link>
                    <b className="db-score low">{pct(studentStats[s.id].avg)}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
