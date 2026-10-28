import { Link, useParams } from "react-router-dom";
import { useDashboard } from "../store";
import { SUBJECTS } from "../data";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import { BarChart } from "../components/Charts";
import { buildTestRows, downloadCSV, fmtDate, pct, tone } from "../utils";

export default function TestDetail() {
  const { id } = useParams();
  const { tests, results, students, testStats } = useDashboard();
  const test = tests.find((t) => String(t.id) === id);

  if (!test) {
    return (
      <>
        <PageHeader title="Test not found" sub="This test may have been deleted." />
        <Link to="/dashboard/tests" className="kw-btn dark">Back to tests</Link>
      </>
    );
  }

  const st = testStats[test.id];
  const rows = buildTestRows(test, results, students);
  const buckets = [0, 0, 0, 0, 0];
  rows.forEach((r) => {
    buckets[Math.min(4, Math.floor(r.score / 20))] += 1;
  });
  const hist = ["0-20", "20-40", "40-60", "60-80", "80-100"].map((label, i) => ({ label, value: buckets[i] }));

  const exportCSV = () =>
    downloadCSV(`${test.name.replace(/\s+/g, "_")}_results.csv`, [
      ["Rank", "Student", "Batch", "Marks", "Total", "Percentage", ...SUBJECTS],
      ...rows.map((r) => [r.rank, r.name, r.batch, r.marks, r.total, pct(r.score), ...SUBJECTS.map((s) => pct(r[s]))]),
    ]);

  const columns = [
    { key: "rank", label: "Rank", sortable: true, render: (r) => `#${r.rank}` },
    { key: "name", label: "Student", sortable: true, render: (r) => <Link to={`/dashboard/students/${r.id}`}>{r.name}</Link> },
    { key: "marks", label: "Marks", sortable: true, render: (r) => `${r.marks} / ${r.total}` },
    { key: "score", label: "Score", sortable: true, render: (r) => <b className={`db-score ${tone(r.score)}`}>{pct(r.score)}</b> },
    ...SUBJECTS.map((s) => ({ key: s, label: s, sortable: true, render: (r) => pct(r[s]) })),
  ];

  return (
    <>
      <PageHeader title={test.name} sub={`${test.type} • ${test.batch} • ${fmtDate(test.date)} • ${test.duration} min • ${test.totalMarks} marks`}>
        <Link to="/dashboard/tests" className="kw-btn db-btn-line">Back to tests</Link>
        <button type="button" className="kw-btn" onClick={exportCSV} disabled={rows.length === 0}>Export CSV</button>
      </PageHeader>

      {test.status !== "Completed" ? (
        <section className="kw-panel">
          <p style={{ margin: 0 }}>
            This test is <b>{test.status.toLowerCase()}</b>. Results appear after it is marked completed on the{" "}
            <Link to="/dashboard/tests"><u>Tests page</u></Link>.
          </p>
        </section>
      ) : (
        <>
          <div className="db-stats">
            <StatCard icon="🧑‍🎓" label="Students appeared" value={st.appeared} tone="blue" />
            <StatCard icon="📊" label="Average score" value={pct(st.avg || 0)} tone="teal" />
            <StatCard icon="🏆" label="Highest score" value={pct(st.high || 0)} tone="orange" />
            <StatCard icon="📉" label="Lowest score" value={pct(st.low || 0)} tone="blue" />
          </div>
          <div className="db-cols">
            <section className="kw-panel">
              <h3>Score distribution (students)</h3>
              <BarChart data={hist} max={Math.max(1, ...buckets)} />
            </section>
            <section className="kw-panel">
              <h3>Subject averages</h3>
              {SUBJECTS.map((s) => {
                const v = rows.length ? rows.reduce((a, r) => a + r[s], 0) / rows.length : 0;
                return <div className="db-prog" key={s}><div className="db-prog-top"><span>{s}</span><b>{pct(v)}</b></div><div className="db-prog-bar"><div style={{ width: `${Math.max(1, v)}%`, background: "#2563eb" }} /></div></div>;
              })}
            </section>
          </div>
          <h3 className="db-sec-title">Student results</h3>
          <DataTable columns={columns} rows={rows} pageSize={10} initialSort={{ key: "rank", dir: "asc" }} />
        </>
      )}
    </>
  );
}
