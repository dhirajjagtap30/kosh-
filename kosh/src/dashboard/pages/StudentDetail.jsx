import { Link, useParams } from "react-router-dom";
import { useDashboard } from "../store";
import { SUBJECTS } from "../data";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import { LineChart } from "../components/Charts";
import { buildStudentRows, downloadCSV, fmtDate, fmtShort, pct, tone } from "../utils";

export default function StudentDetail() {
  const { id } = useParams();
  const { students, studentStats, results, tests } = useDashboard();
  const student = students.find((s) => String(s.id) === id);

  if (!student) {
    return (
      <>
        <PageHeader title="Student not found" sub="This student may have been removed." />
        <Link to="/dashboard/students" className="kw-btn dark">Back to students</Link>
      </>
    );
  }

  const st = studentStats[student.id];
  const rows = buildStudentRows(student.id, results, tests);
  const trend = rows.map((r) => ({ label: fmtShort(r.date), value: r.score }));

  const exportCSV = () =>
    downloadCSV(`${student.name.replace(/\s+/g, "_")}_report.csv`, [
      ["Test", "Date", "Marks", "Total", "Percentage", "Rank in test", ...SUBJECTS],
      ...rows.map((r) => [r.name, r.date, r.marks, r.total, pct(r.score), r.rank, ...SUBJECTS.map((s) => pct(r[s]))]),
    ]);

  const columns = [
    { key: "name", label: "Test", sortable: true, render: (r) => <Link to={`/dashboard/tests/${r.id}`}>{r.name}</Link> },
    { key: "date", label: "Date", sortable: true, render: (r) => fmtDate(r.date) },
    { key: "marks", label: "Marks", render: (r) => `${r.marks} / ${r.total}` },
    { key: "score", label: "Score", sortable: true, render: (r) => <b className={`db-score ${tone(r.score)}`}>{pct(r.score)}</b> },
    { key: "rank", label: "Rank in test", sortable: true, render: (r) => `#${r.rank}` },
  ];

  return (
    <>
      <PageHeader title={student.name} sub={`${student.batch}${student.phone ? ` • ${student.phone}` : ""}`}>
        <Link to="/dashboard/students" className="kw-btn db-btn-line">Back to students</Link>
        <button type="button" className="kw-btn" onClick={exportCSV} disabled={rows.length === 0}>Export report</button>
      </PageHeader>

      <div className="db-stats">
        <StatCard icon="📝" label="Tests taken" value={st.taken} tone="blue" />
        <StatCard icon="📊" label="Average score" value={st.avg == null ? "—" : pct(st.avg)} tone="teal" />
        <StatCard icon="🏅" label="Overall rank" value={st.rank == null ? "—" : `#${st.rank}`} tone="orange" />
        <StatCard icon="🏆" label="Best score" value={st.best == null ? "—" : pct(st.best)} tone="blue" />
      </div>

      <section className="kw-panel" style={{ marginBottom: 20 }}>
        <h3>Score trend</h3>
        <LineChart data={trend} />
      </section>

      <h3 className="db-sec-title">Test history</h3>
      <DataTable columns={columns} rows={rows} pageSize={8} emptyText="No completed tests for this student yet." />
    </>
  );
}
