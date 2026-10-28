import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDashboard } from "../store";
import { BATCHES, SUBJECTS } from "../data";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import { buildStudentRows, buildTestRows, downloadCSV, fmtDate, pct, tone } from "../utils";

export default function Reports() {
  const { tests, students, results, studentStats } = useDashboard();
  const completed = useMemo(() => tests.filter((t) => t.status === "Completed"), [tests]);

  const [testId, setTestId] = useState("");
  const [batch, setBatch] = useState("All");
  const [studentId, setStudentId] = useState("");

  const test = completed.find((t) => String(t.id) === testId) || completed[0];
  const student = students.find((s) => String(s.id) === studentId) || students[0];

  const testRows = useMemo(() => (test ? buildTestRows(test, results, students) : []), [test, results, students]);
  const studentRows = useMemo(() => (student ? buildStudentRows(student.id, results, tests) : []), [student, results, tests]);

  const downloadBatchResults = () =>
    downloadCSV(`${test.name.replace(/\s+/g, "_")}_batch_results.csv`, [
      ["Rank", "Student", "Batch", "Marks", "Total", "Percentage", ...SUBJECTS],
      ...testRows.map((r) => [r.rank, r.name, r.batch, r.marks, r.total, pct(r.score), ...SUBJECTS.map((s) => pct(r[s]))]),
    ]);

  const downloadSummary = () => {
    const list = students.filter((s) => batch === "All" || s.batch === batch);
    downloadCSV(`student_summary_${batch.replace(/\s+/g, "_")}.csv`, [
      ["Rank", "Student", "Batch", "Mobile", "Tests taken", "Average %"],
      ...list.map((s) => {
        const st = studentStats[s.id];
        return [st.rank == null ? "" : st.rank, s.name, s.batch, s.phone, st.taken, st.avg == null ? "" : pct(st.avg)];
      }),
    ]);
  };

  const downloadIndividual = () =>
    downloadCSV(`${student.name.replace(/\s+/g, "_")}_report.csv`, [
      ["Test", "Date", "Marks", "Total", "Percentage", "Rank in test", ...SUBJECTS],
      ...studentRows.map((r) => [r.name, r.date, r.marks, r.total, pct(r.score), r.rank, ...SUBJECTS.map((s) => pct(r[s]))]),
    ]);

  const previewCols = [
    { key: "rank", label: "Rank", render: (r) => `#${r.rank}` },
    { key: "name", label: "Student" },
    { key: "marks", label: "Marks", render: (r) => `${r.marks} / ${r.total}` },
    { key: "score", label: "Score", render: (r) => <b className={`db-score ${tone(r.score)}`}>{pct(r.score)}</b> },
  ];
  const studentCols = [
    { key: "name", label: "Test" },
    { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
    { key: "marks", label: "Marks", render: (r) => `${r.marks} / ${r.total}` },
    { key: "score", label: "Score", render: (r) => <b className={`db-score ${tone(r.score)}`}>{pct(r.score)}</b> },
    { key: "rank", label: "Rank in test", render: (r) => `#${r.rank}` },
  ];

  return (
    <>
      <PageHeader title="Reports" sub="Data → Insight → Action. Download results for analysis and parent-teacher meetings." />

      <div className="db-grid3">
        <section className="kw-card db-report">
          <div className="ic" />
          <h4>Batch results</h4>
          <p>Marks, rank and subject scores for one test.</p>
          <select className="db-input" aria-label="Select test" value={test ? String(test.id) : ""} onChange={(e) => setTestId(e.target.value)} disabled={!completed.length}>
            {completed.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" className="kw-btn" onClick={downloadBatchResults} disabled={!test || testRows.length === 0}>Download CSV</button>
        </section>

        <section className="kw-card teal db-report">
          <div className="ic" />
          <h4>Excel export</h4>
          <p>Student-wise summary for a batch (opens in Excel).</p>
          <select className="db-input" aria-label="Select batch" value={batch} onChange={(e) => setBatch(e.target.value)}>
            <option value="All">All batches</option>{BATCHES.map((b) => <option key={b}>{b}</option>)}
          </select>
          <button type="button" className="kw-btn" onClick={downloadSummary}>Download for Excel</button>
        </section>

        <section className="kw-card orange db-report">
          <div className="ic" />
          <h4>Individual report</h4>
          <p>Student-wise report for Parent-Teacher Meetings.</p>
          <select className="db-input" aria-label="Select student" value={student ? String(student.id) : ""} onChange={(e) => setStudentId(e.target.value)} disabled={!students.length}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="db-actions">
            <button type="button" className="kw-btn" onClick={downloadIndividual} disabled={!student || studentRows.length === 0}>Download CSV</button>
            <button type="button" className="kw-btn dark" onClick={() => window.print()} disabled={!student}>Print</button>
          </div>
        </section>
      </div>

      {test && (
        <>
          <h3 className="db-sec-title">Preview: {test.name}</h3>
          <DataTable columns={previewCols} rows={testRows} pageSize={5} emptyText="No results for this test." />
        </>
      )}

      {student && (
        <>
          <h3 className="db-sec-title" style={{ marginTop: 24 }}>
            Preview: <Link to={`/dashboard/students/${student.id}`}>{student.name}</Link>
          </h3>
          <DataTable columns={studentCols} rows={studentRows} pageSize={5} emptyText="No completed tests for this student yet." />
        </>
      )}
    </>
  );
}
