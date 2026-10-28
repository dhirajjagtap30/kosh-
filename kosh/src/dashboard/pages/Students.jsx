import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDashboard } from "../store";
import { BATCHES } from "../data";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { pct, tone } from "../utils";

function StudentForm({ onSubmit, onCancel }) {
  const [f, setF] = useState({ name: "", batch: BATCHES[0], phone: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!f.name.trim()) return setErr("Enter the student's name.");
    if (f.phone && !/^\d{10}$/.test(f.phone)) return setErr("Mobile number must be 10 digits.");
    setErr("");
    setBusy(true);
    const res = await onSubmit({ ...f, name: f.name.trim() });
    setBusy(false);
    if (res && !res.ok) setErr(res.error); // on success the parent closes the form
  };
  return (
    <form onSubmit={submit} noValidate>
      <label className="db-field">Full name
        <input className="db-input" value={f.name} onChange={set("name")} autoFocus />
      </label>
      <div className="db-row2">
        <label className="db-field">Batch
          <select className="db-input" value={f.batch} onChange={set("batch")}>{BATCHES.map((b) => <option key={b}>{b}</option>)}</select>
        </label>
        <label className="db-field">Mobile (optional)
          <input className="db-input" inputMode="numeric" maxLength={10} value={f.phone} onChange={set("phone")} />
        </label>
      </div>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Adding…" : "Add student"}</button>
      </div>
    </form>
  );
}

export default function Students() {
  const { students, studentStats, addStudent, deleteStudent } = useDashboard();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState("All");
  const [adding, setAdding] = useState(false);

  const rows = useMemo(
    () =>
      students
        .filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()))
        .filter((s) => batch === "All" || s.batch === batch)
        .map((s) => ({ ...s, taken: studentStats[s.id].taken, avg: studentStats[s.id].avg, rank: studentStats[s.id].rank })),
    [students, studentStats, q, batch]
  );

  const columns = [
    { key: "name", label: "Student", sortable: true, render: (r) => <Link to={`/dashboard/students/${r.id}`}><b>{r.name}</b></Link> },
    { key: "batch", label: "Batch", sortable: true },
    { key: "phone", label: "Mobile" },
    { key: "taken", label: "Tests taken", sortable: true },
    { key: "avg", label: "Average", sortable: true, render: (r) => (r.avg == null ? "—" : <b className={`db-score ${tone(r.avg)}`}>{pct(r.avg)}</b>) },
    { key: "rank", label: "Rank", sortable: true, render: (r) => (r.rank == null ? "—" : `#${r.rank}`) },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="db-actions">
          <Link className="kw-btn db-btn-sm db-btn-line" to={`/dashboard/students/${r.id}`}>View</Link>
          <button type="button" className="kw-btn db-btn-sm db-btn-danger"
            onClick={() => window.confirm(`Remove ${r.name}?`) && deleteStudent(r.id)}>Remove</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Students" sub={`${students.length} students across ${BATCHES.length} batches.`}>
        <button type="button" className="kw-btn" onClick={() => setAdding(true)}>Add student</button>
      </PageHeader>

      <div className="db-toolbar">
        <input className="db-input grow" type="search" placeholder="Search students" aria-label="Search students" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="db-input" aria-label="Filter by batch" value={batch} onChange={(e) => setBatch(e.target.value)}>
          <option value="All">All batches</option>{BATCHES.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={rows} pageSize={8} initialSort={{ key: "rank", dir: "asc" }}
        onRowClick={(r) => navigate(`/dashboard/students/${r.id}`)} emptyText="No students match your search." />

      {adding && (
        <Modal title="Add student" onClose={() => setAdding(false)}>
          <StudentForm
            onCancel={() => setAdding(false)}
            onSubmit={async (s) => {
              const res = await addStudent(s);
              if (res.ok) setAdding(false);
              return res;
            }}
          />
        </Modal>
      )}
    </>
  );
}
