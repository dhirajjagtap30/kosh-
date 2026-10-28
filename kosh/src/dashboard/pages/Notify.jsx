import { useMemo, useState } from "react";
import { batchService, registrationService, sendNotificationService, getErrorMessage } from "../../services";
import { useCollection, Gate } from "../useCollection";
import { REG_STANDARDS } from "../data";
import PageHeader from "../components/PageHeader";
import "./teacher.css";

/* Teacher -> Send notification. Students see it under the bell; parents see it under View Notices. */
export default function Notify() {
  const bc = useCollection(batchService);
  const rc = useCollection(registrationService);
  const [audience, setAudience] = useState("batches");
  const [standard, setStandard] = useState("");
  const [batchIds, setBatchIds] = useState([]);
  const [studentIds, setStudentIds] = useState([]);
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (set, id) => set((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const students = useMemo(() => (rc.rows || []).filter((s) => s.status !== "Inactive" && (!standard || s.standard === standard)
    && `${s.name} ${s.mobile}`.toLowerCase().includes(q.trim().toLowerCase())), [rc.rows, standard, q]);

  const send = async (e) => {
    e.preventDefault();
    setErr(""); setDone("");
    if (!title.trim()) return setErr("Enter a title.");
    if (!message.trim()) return setErr("Write the message.");
    if (audience === "batches" && !batchIds.length) return setErr("Select at least one batch.");
    if (audience === "standard" && !standard) return setErr("Select the standard.");
    if (audience === "students" && !studentIds.length) return setErr("Select at least one student.");
    setBusy(true);
    try {
      const res = await sendNotificationService.send({ title: title.trim(), message: message.trim(), audience, standard, batchIds, studentIds });
      setDone(`Notification sent to ${res.sent} student${res.sent === 1 ? "" : "s"} (their parents can see it too).`);
      setTitle(""); setMessage(""); setBatchIds([]); setStudentIds([]);
    } catch (e2) { setErr(getErrorMessage(e2)); }
    setBusy(false);
  };

  return (
    <>
      <PageHeader title="Send notification" sub="Send a message to a whole standard, selected batches or chosen students." />
      <Gate cs={[bc, rc]} label="Loading…">
        <form className="kw-panel" onSubmit={send} noValidate>
          {done && <p className="tm-ok" role="status">✅ {done}</p>}
          <div className="db-seg" role="radiogroup" aria-label="Send to">
            {[["batches", "👪 Batches"], ["standard", "🏫 Whole standard"], ["students", "🎓 Selected students"]].map(([k, l]) => (
              <button type="button" key={k} role="radio" aria-checked={audience === k} className={audience === k ? "on" : ""} onClick={() => { setAudience(k); setErr(""); }}>{l}</button>
            ))}
          </div>

          {audience === "batches" && (
            !(bc.rows || []).length ? <p className="db-muted">No batches yet. Create one under Batches first.</p> :
            <div className="tm-chips">{bc.rows.map((b) => (
              <label key={b.id} className={batchIds.includes(b.id) ? "on" : ""}>
                <input type="checkbox" checked={batchIds.includes(b.id)} onChange={() => toggle(setBatchIds, b.id)} />{b.name} <small>({b.standard} · {(b.studentIds || []).length})</small>
              </label>))}</div>
          )}
          {audience === "standard" && (
            <label className="db-field">Standard
              <select className="db-input" value={standard} onChange={(e) => setStandard(e.target.value)}><option value="">Select</option>{REG_STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
          )}
          {audience === "students" && (
            <>
              <div className="db-toolbar">
                <input className="db-input grow" type="search" placeholder="Search student" aria-label="Search student" value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="db-input" aria-label="Standard" value={standard} onChange={(e) => setStandard(e.target.value)}><option value="">All standards</option>{REG_STANDARDS.map((x) => <option key={x}>{x}</option>)}</select>
              </div>
              <div className="db-pick-head"><b>{studentIds.length} selected</b>
                <button type="button" className="db-link-btn" onClick={() => setStudentIds((l) => (students.every((s) => l.includes(s.id)) ? l.filter((id) => !students.some((s) => s.id === id)) : [...new Set([...l, ...students.map((s) => s.id)])]))}>Select / clear shown</button></div>
              <div className="db-batch-list">{!students.length ? <p className="db-muted">No students found.</p> : students.map((s) => (
                <label key={s.id} className="db-pick-row"><input type="checkbox" checked={studentIds.includes(s.id)} onChange={() => toggle(setStudentIds, s.id)} /><span>{s.name}<small className="db-muted"> — {s.standard}</small></span></label>))}</div>
            </>
          )}

          <label className="db-field">Title<input className="db-input" maxLength={80} value={title} onChange={(e) => { setTitle(e.target.value); setErr(""); }} placeholder="e.g. Class timing changed" /></label>
          <label className="db-field">Message<textarea className="db-input" rows={4} maxLength={1000} value={message} onChange={(e) => { setMessage(e.target.value); setErr(""); }} /></label>
          {err && <p className="db-err" role="alert">{err}</p>}
          <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Sending…" : "Send notification"}</button>
        </form>
      </Gate>
    </>
  );
}
