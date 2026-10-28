import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDashboard } from "../store";
import { BATCHES, TEST_TYPES, STANDARDS } from "../data";
import { paperService, batchService, testNotifyService, getErrorMessage } from "../../services";
import ExamResults from "../ExamResults";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { fmtDate, pct, tone, todayISO } from "../utils";

function TestForm({ onSubmit, onCancel }) {
  const [papers, setPapers] = useState([]);
  const [batches, setBatches] = useState([]);
  useEffect(() => { paperService.list().then((r) => setPapers(r.filter((p) => p.status === "Published"))).catch(() => setPapers([])); }, []);
  useEffect(() => { batchService.list().then(setBatches).catch(() => setBatches([])); }, []);
  const [f, setF] = useState({ name: "", standard: "", paperId: "", batchIds: [], type: TEST_TYPES[0], batch: BATCHES[0], date: todayISO(), duration: 60, totalMarks: 100, status: "Scheduled" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = papers.filter((p) => p.standard === f.standard);
  const paper = papers.find((p) => p.id === Number(f.paperId));
  const stdBatches = batches.filter((b) => b.standard === f.standard);
  const toggleBatch = (id) => setF({ ...f, batchIds: f.batchIds.includes(id) ? f.batchIds.filter((x) => x !== id) : [...f.batchIds, id] });
  const pickStd = (e) => setF({ ...f, standard: e.target.value, paperId: "", batchIds: [] }); // new standard -> choose the paper and batches again
  const pickPaper = (e) => {
    const p = papers.find((x) => x.id === Number(e.target.value));
    setF({ ...f, paperId: e.target.value, ...(p ? { duration: p.duration, totalMarks: p.totalMarks } : {}) });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!f.name.trim()) return setErr("Enter a test name.");
    if (!f.standard) return setErr("Select the standard — only students of that standard will see this test.");
    if (Number(f.duration) < 1 || Number(f.totalMarks) < 1) return setErr("Duration and total marks must be at least 1.");
    setErr("");
    setBusy(true);
    const res = await onSubmit({ ...f, batchIds: f.batchIds, paperId: f.paperId ? Number(f.paperId) : null, name: f.name.trim(), duration: Number(f.duration), totalMarks: Number(f.totalMarks) });
    setBusy(false);
    if (res && !res.ok) setErr(res.error); // on success the parent closes the form
  };

  return (
    <form onSubmit={submit} noValidate>
      <label className="db-field">Test name
        <input className="db-input" value={f.name} onChange={set("name")} placeholder="e.g. Physics DPP - Optics" autoFocus />
      </label>
      <label className="db-field">Standard (students of this standard will see the test)
        <select className="db-input" value={f.standard} onChange={pickStd}>
          <option value="">Select standard</option>{STANDARDS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="db-field">Question paper (optional — students can take it online)
        <select className="db-input" value={f.paperId} onChange={pickPaper} disabled={!f.standard}>
          <option value="">{!f.standard ? "Select standard first" : list.length ? "No online paper (offline test)" : `No published paper for ${f.standard}`}</option>
          {list.map((p) => <option key={p.id} value={p.id}>{p.title} — {p.subject}</option>)}
        </select>
      </label>
      {paper && <p className="db-muted" style={{ marginTop: -6 }}>{paper.questionIds.length} questions · {paper.totalMarks} marks · {paper.duration} min (taken from the paper)</p>}
      {f.standard && (
        <div className="db-field">Assign to batches
          {stdBatches.length ? (
            <div className="db-batch-list" style={{ marginTop: 4 }}>
              {stdBatches.map((b) => (
                <label key={b.id} className="db-pick-row"><input type="checkbox" checked={f.batchIds.includes(b.id)} onChange={() => toggleBatch(b.id)} /><span>{b.name}<small className="db-muted"> — {b.studentCount ?? (b.studentIds || []).length} students</small></span></label>
              ))}
            </div>
          ) : <small className="db-muted">No batches for {f.standard} yet (create them on the Batches page).</small>}
          <small className="db-muted">{f.batchIds.length ? `Only students of the ${f.batchIds.length} selected batch${f.batchIds.length > 1 ? "es" : ""} will see this test.` : `Nothing selected → every registered student of ${f.standard} will see this test.`}</small>
        </div>
      )}
      <div className="db-row2">
        <label className="db-field">Type
          <select className="db-input" value={f.type} onChange={set("type")}>{TEST_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label className="db-field">Batch
          <select className="db-input" value={f.batch} onChange={set("batch")}>{BATCHES.map((b) => <option key={b}>{b}</option>)}</select>
        </label>
      </div>
      <div className="db-row2">
        <label className="db-field">Date
          <input type="date" className="db-input" value={f.date} onChange={set("date")} />
        </label>
        <label className="db-field">Status
          <select className="db-input" value={f.status} onChange={set("status")}><option>Draft</option><option>Scheduled</option></select>
        </label>
      </div>
      <div className="db-row2">
        <label className="db-field">Duration (minutes)
          <input type="number" min="1" className="db-input" value={f.duration} onChange={set("duration")} disabled={Boolean(paper)} />
        </label>
        <label className="db-field">Total marks
          <input type="number" min="1" className="db-input" value={f.totalMarks} onChange={set("totalMarks")} disabled={Boolean(paper)} />
        </label>
      </div>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Creating…" : "Create test"}</button>
      </div>
    </form>
  );
}

/* change which batches a test is assigned to (none selected = whole standard) */
function AssignModal({ test, onClose, onSave }) {
  const [batches, setBatches] = useState(null);
  const [ids, setIds] = useState(test.batchIds || []);
  const [err, setErr] = useState("");
  useEffect(() => { batchService.list().then((r) => setBatches(r.filter((b) => b.standard === test.standard))).catch(() => setBatches([])); }, [test.standard]);
  const toggle = (id) => setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const save = async () => { const res = await onSave(test.id, ids); if (res.ok) onClose(); else setErr(res.error); };
  return (
    <Modal title={`Assign — ${test.name}`} onClose={onClose}>
      <p className="db-muted" style={{ marginTop: 0 }}>Std {test.standard}. Select the batches that should see this test. Select none to give it to every student of the standard.</p>
      <div className="db-batch-list">
        {!batches ? <p className="db-muted">Loading batches…</p> : !batches.length ? <p className="db-muted">No batches for {test.standard} yet — create them on the Batches page.</p>
          : batches.map((b) => <label key={b.id} className="db-pick-row"><input type="checkbox" checked={ids.includes(b.id)} onChange={() => toggle(b.id)} /><span>{b.name}<small className="db-muted"> — {(b.studentIds || []).length} students</small></span></label>)}
      </div>
      {err && <p className="db-err" role="alert">{err}</p>}
      <div className="db-modal-foot">
        <button type="button" className="kw-btn db-btn-line" onClick={onClose}>Cancel</button>
        <button type="button" className="kw-btn" onClick={save}>Save</button>
      </div>
    </Modal>
  );
}

export default function Tests() {
  const { tests, testStats, addTest, deleteTest, setTestStatus, assignBatches } = useDashboard();
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [batch, setBatch] = useState("All");
  const [std, setStd] = useState("All");
  const [results, setResults] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [notice, setNotice] = useState(null); // { ok, text } after "Notify students"
  const notify = async (t) => {
    if (!window.confirm(`Send a notification about "${t.name}" to the students of Std ${t.standard}${t.batchNames && t.batchNames.length ? ` (${t.batchNames.join(", ")})` : ""}?`)) return;
    try { const r = await testNotifyService.send(t.id); setNotice({ ok: true, text: `Notification sent to ${r.sent} student${r.sent === 1 ? "" : "s"}.` }); } catch (e) { setNotice({ ok: false, text: getErrorMessage(e) }); }
  };
  const [creating, setCreating] = useState(Boolean(location.state && location.state.create));

  useEffect(() => {
    // the "Create test" shortcut on Overview opens the form; clear the flag so refresh doesn't reopen it
    if (location.state && location.state.create) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(
    () =>
      tests
        .filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()))
        .filter((t) => type === "All" || t.type === type)
        .filter((t) => status === "All" || t.status === status)
        .filter((t) => batch === "All" || t.batch === batch)
        .filter((t) => std === "All" || t.standard === std)
        .map((t) => ({ ...t, appeared: testStats[t.id].appeared, avg: testStats[t.id].avg })),
    [tests, testStats, q, type, status, batch, std]
  );

  const columns = [
    { key: "name", label: "Test", sortable: true, render: (r) => <Link to={`/dashboard/tests/${r.id}`}><b>{r.name}</b></Link> },
    { key: "standard", label: "Std", sortable: true, render: (r) => r.standard || "—" },
    { key: "type", label: "Type", sortable: true },
    { key: "batch", label: "Batch", sortable: true },
    { key: "assigned", label: "Assigned to", render: (r) => (!r.paperId ? "—" : r.batchNames.length ? r.batchNames.join(", ") : `All Std ${r.standard}`) },
    { key: "date", label: "Date", sortable: true, render: (r) => fmtDate(r.date) },
    { key: "duration", label: "Duration", sortable: true, render: (r) => `${r.duration} min` },
    { key: "appeared", label: "Students", sortable: true },
    { key: "avg", label: "Avg", sortable: true, render: (r) => (r.avg == null ? "—" : <b className={`db-score ${tone(r.avg)}`}>{pct(r.avg)}</b>) },
    { key: "status", label: "Status", sortable: true, render: (r) => <span className={`db-badge-s ${r.status.toLowerCase()}`}>{r.status}</span> },
    { key: "resultAnnounced", label: "Result", render: (r) => (!r.paperId ? "—" : <span className={`db-badge-s ${r.resultAnnounced ? "completed" : "draft"}`}>{r.resultAnnounced ? "Announced" : "Not announced"}</span>) },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="db-actions">
          <Link className="kw-btn db-btn-sm db-btn-line" to={`/dashboard/tests/${r.id}`}>View</Link>
          {r.paperId && <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setResults(r)}>Results ({r.attempts}{r.pendingChecks ? ` · ${r.pendingChecks} to check` : ""})</button>}
          {r.paperId && r.status !== "Completed" && <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setAssigning(r)}>Assign</button>}
          {r.status !== "Draft" && r.status !== "Completed" && <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => notify(r)}>🔔 Notify</button>}
          {r.status === "Draft" && (
            <button type="button" className="kw-btn db-btn-sm" onClick={() => setTestStatus(r.id, "Scheduled")}>Publish</button>
          )}
          {r.status === "Scheduled" && (
            <>
              <button type="button" className="kw-btn db-btn-sm db-btn-line" onClick={() => setTestStatus(r.id, "Draft")}>Unpublish</button>
              <button type="button" className="kw-btn db-btn-sm" onClick={() => setTestStatus(r.id, "Completed")}>Mark completed</button>
            </>
          )}
          <button
            type="button"
            className="kw-btn db-btn-sm db-btn-danger"
            onClick={() => window.confirm(`Delete "${r.name}"?`) && deleteTest(r.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Tests" sub="Create, publish and review your tests.">
        <button type="button" className="kw-btn" onClick={() => setCreating(true)}>Create test</button>
      </PageHeader>
      {notice && <p className={notice.ok ? undefined : "db-err"} role="status" style={{ margin: "0 0 12px", ...(notice.ok ? { color: "#166534", fontWeight: 600 } : {}) }}>{notice.text} <button type="button" className="db-link-btn" onClick={() => setNotice(null)}>Dismiss</button></p>}

      <div className="db-toolbar">
        <input className="db-input grow" type="search" placeholder="Search tests" aria-label="Search tests" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="db-input" aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="All">All types</option>{TEST_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="db-input" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All statuses</option><option>Completed</option><option>Scheduled</option><option>Draft</option>
        </select>
        <select className="db-input" aria-label="Filter by batch" value={batch} onChange={(e) => setBatch(e.target.value)}>
          <option value="All">All batches</option>{BATCHES.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select className="db-input" aria-label="Filter by standard" value={std} onChange={(e) => setStd(e.target.value)}>
          <option value="All">All standards</option>{STANDARDS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={rows} pageSize={8} initialSort={{ key: "date", dir: "desc" }} emptyText="No tests match your filters." />

      {results && <ExamResults exam={results} onClose={() => setResults(null)} />}

      {assigning && <AssignModal test={tests.find((x) => x.id === assigning.id) || assigning} onClose={() => setAssigning(null)} onSave={assignBatches} />}

      {creating && (
        <Modal title="Create test" onClose={() => setCreating(false)}>
          <TestForm
            onCancel={() => setCreating(false)}
            onSubmit={async (t) => {
              const res = await addTest(t);
              if (res.ok) setCreating(false);
              return res;
            }}
          />
        </Modal>
      )}
    </>
  );
}
