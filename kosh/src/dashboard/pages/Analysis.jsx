import { useMemo, useState } from "react";
import { useDashboard } from "../store";
import { BATCHES, SUBJECTS } from "../data";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { BarChart, Donut, LineChart, ProgressBar } from "../components/Charts";
import { avg, fmtShort, pct } from "../utils";

export default function Analysis() {
  const { students, tests, results, batchAvg } = useDashboard();
  const [batch, setBatch] = useState("All");

  const view = useMemo(() => {
    const ids = new Set(students.filter((s) => batch === "All" || s.batch === batch).map((s) => s.id));
    const rs = results.filter((r) => ids.has(r.studentId));
    const trend = tests
      .filter((t) => t.status === "Completed" && (batch === "All" || t.batch === batch))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => ({ label: fmtShort(t.date), value: avg(rs.filter((r) => r.testId === t.id).map((r) => r.score)) }));
    const buckets = [0, 0, 0, 0, 0];
    rs.forEach((r) => {
      buckets[Math.min(4, Math.floor(r.score / 20))] += 1;
    });
    const mean = avg(rs.map((r) => r.score));
    // DEMO estimate of answer split; replace with real question-level data from your API
    const incorrect = (100 - mean) * 0.4;
    return {
      count: ids.size,
      mean,
      trend,
      hist: ["0-20", "20-40", "40-60", "60-80", "80-100"].map((label, i) => ({ label, value: buckets[i] })),
      histMax: Math.max(1, ...buckets),
      subjects: SUBJECTS.map((s) => ({ label: s, value: avg(rs.map((r) => r.subjects[s])) })),
      split: [
        { label: "Correct", value: mean, color: "#16a34a" },
        { label: "Incorrect", value: incorrect, color: "#dc2626" },
        { label: "Unattempted", value: Math.max(0, 100 - mean - incorrect), color: "#94a3b8" },
      ],
      best: trend.length ? Math.max(...trend.map((t) => t.value)) : 0,
    };
  }, [students, tests, results, batch]);

  return (
    <>
      <PageHeader title="Analysis" sub="Turn every test into actionable academic intelligence.">
        <select className="db-input" aria-label="Select batch" value={batch} onChange={(e) => setBatch(e.target.value)}>
          <option value="All">All batches</option>{BATCHES.map((b) => <option key={b}>{b}</option>)}
        </select>
      </PageHeader>

      <div className="db-stats">
        <StatCard icon="🎓" label="Students" value={view.count} tone="blue" />
        <StatCard icon="📊" label="Average score" value={pct(view.mean)} tone="teal" />
        <StatCard icon="🏆" label="Best test average" value={pct(view.best)} tone="orange" />
        <StatCard icon="🧪" label="Tests analysed" value={view.trend.length} tone="blue" />
      </div>

      <div className="db-cols">
        <section className="kw-panel"><h3>Average score per test</h3><LineChart data={view.trend} /></section>
        <section className="kw-panel">
          <h3>Answer breakdown</h3>
          <Donut segments={view.split} centerValue={pct(view.mean)} centerLabel="Correct" />
        </section>
      </div>

      <div className="db-cols even">
        <section className="kw-panel"><h3>Score distribution (students)</h3><BarChart data={view.hist} max={view.histMax} /></section>
        <section className="kw-panel">
          <h3>Subject-wise performance</h3>
          {view.subjects.map((s, i) => <ProgressBar key={s.label} label={s.label} value={s.value} color={["#2563eb", "#0ea5e9", "#38bdf8"][i % 3]} />)}
          <h3 style={{ marginTop: 22 }}>Batch comparison</h3>
          <BarChart data={batchAvg} suffix="%" />
        </section>
      </div>
    </>
  );
}
