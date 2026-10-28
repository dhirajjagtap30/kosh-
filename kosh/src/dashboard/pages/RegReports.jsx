import { useMemo } from "react";
import { registrationService, questionService, paperService } from "../../services";
import { useCollection, Gate } from "../useCollection";
import { STANDARDS, REG_STANDARDS, MEDIUMS, QUESTION_SUBJECTS } from "../data";
import { downloadCSV } from "../utils";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const count = (list, fn) => list.filter(fn).length;

export default function RegReports() {
  const rc = useCollection(registrationService);
  const qc = useCollection(questionService);
  const pc = useCollection(paperService);
  const regs = rc.rows || [], qs = qc.rows || [], ps = pc.rows || [];

  const subjects = useMemo(() => QUESTION_SUBJECTS.filter((s) => qs.some((q) => q.subject === s) || ps.some((p) => p.subject === s)), [qs, ps]);

  return (
    <>
      <PageHeader title="Registration Reports" sub="Registrations, question bank and question papers at a glance." />
      <Gate cs={[rc, qc, pc]} label="Preparing reports…">
        <div className="db-stats">
          <StatCard icon="📝" label="Registrations" value={regs.length} note={`${count(regs, (r) => r.status === "Active")} active`} />
          <StatCard icon="❓" label="Questions" value={qs.length} note={`${qs.reduce((s, q) => s + q.marks, 0)} marks in bank`} tone="green" />
          <StatCard icon="🗂️" label="Question papers" value={ps.length} note={`${count(ps, (p) => p.status === "Published")} published`} tone="orange" />
          <StatCard icon="📚" label="Subjects covered" value={subjects.length} tone="purple" />
        </div>

        <section className="kw-panel db-rep">
          <div className="db-rep-head"><h2>Registrations by standard &amp; medium</h2>
            <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => downloadCSV("registration-report.csv", [["Standard", ...MEDIUMS, "Total"], ...REG_STANDARDS.map((s) => [s, ...MEDIUMS.map((m) => count(regs, (r) => r.standard === s && r.medium === m)), count(regs, (r) => r.standard === s)])])}>Export CSV</button></div>
          <div className="db-scroll"><table className="db-rtable"><thead><tr><th>Standard</th>{MEDIUMS.map((m) => <th key={m}>{m}</th>)}<th>Total</th></tr></thead>
            <tbody>{REG_STANDARDS.map((s) => <tr key={s}><td>{s}</td>{MEDIUMS.map((m) => <td key={m}>{count(regs, (r) => r.standard === s && r.medium === m)}</td>)}<td><b>{count(regs, (r) => r.standard === s)}</b></td></tr>)}</tbody></table></div>
        </section>

        <section className="kw-panel db-rep">
          <div className="db-rep-head"><h2>Questions &amp; papers by standard and subject</h2>
            <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => downloadCSV("question-paper-report.csv", [["Standard", "Subject", "Questions", "Total marks", "Papers"], ...STANDARDS.flatMap((s) => subjects.map((sub) => [s, sub, count(qs, (q) => q.standard === s && q.subject === sub), qs.filter((q) => q.standard === s && q.subject === sub).reduce((a, q) => a + q.marks, 0), count(ps, (p) => p.standard === s && p.subject === sub)]).filter((r) => r[2] || r[4]))])}>Export CSV</button></div>
          <div className="db-scroll"><table className="db-rtable"><thead><tr><th>Standard</th><th>Subject</th><th>Questions</th><th>Marks</th><th>Papers</th></tr></thead>
            <tbody>{STANDARDS.flatMap((s) => subjects.map((sub) => ({ s, sub, n: count(qs, (q) => q.standard === s && q.subject === sub), m: qs.filter((q) => q.standard === s && q.subject === sub).reduce((a, q) => a + q.marks, 0), p: count(ps, (p) => p.standard === s && p.subject === sub) })).filter((r) => r.n || r.p)).map((r) => <tr key={r.s + r.sub}><td>{r.s}</td><td>{r.sub}</td><td>{r.n}</td><td>{r.m}</td><td>{r.p}</td></tr>)}
              {!qs.length && <tr><td colSpan={5} className="db-muted">No questions yet.</td></tr>}</tbody></table></div>
        </section>
      </Gate>
    </>
  );
}
