import { useEffect, useState } from "react";
import { parentMessageService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

const when = (d) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const field = { width: "100%", border: "1px solid #cbd5e8", borderRadius: 10, padding: "10px 12px", font: "inherit", color: "#0a2463", background: "#fff" };

/* "Send Message" tab: write to the institute (admin / teachers) and read their replies. */
export default function ParentMessages() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const load = () => { setErr(""); parentMessageService.list().then(setRows).catch((e) => setErr(getErrorMessage(e))); };
  useEffect(load, []);

  const send = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!subject.trim()) return setNote({ ok: false, text: "Enter a subject." });
    if (!text.trim()) return setNote({ ok: false, text: "Write your message." });
    setBusy(true); setNote(null);
    try {
      const m = await parentMessageService.send(subject, text);
      setRows((r) => [m, ...(r || [])]); setSubject(""); setText("");
      setNote({ ok: true, text: "Message sent to the institute." });
    } catch (x) { setNote({ ok: false, text: getErrorMessage(x) }); } finally { setBusy(false); }
  };

  return (
    <div className="kd-full" style={{ display: "grid", gap: 20 }}>
      <section className="kd-card">
        <h3>Send Message</h3>
        <form className="in" onSubmit={send} noValidate style={{ display: "grid", gap: 12 }}>
          <label>Subject<input style={field} value={subject} maxLength={100} placeholder="e.g. Leave request, fee query, doubt about marks" onChange={(e) => { setSubject(e.target.value); setNote(null); }} /></label>
          <label>Message<textarea style={{ ...field, minHeight: 120, resize: "vertical" }} value={text} maxLength={1000} onChange={(e) => { setText(e.target.value); setNote(null); }} /></label>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" className="kw-btn" disabled={busy}>{busy ? "Sending…" : "📨 Send"}</button>
            <small style={{ color: "#8a94a6" }}>{text.length}/1000</small>
            {note && <b role="alert" style={{ color: note.ok ? "#15803d" : "#dc2626" }}>{note.text}</b>}
          </div>
        </form>
      </section>
      <section className="kd-card">
        <h3>My messages</h3>
        {err ? <ErrorState message={err} onRetry={load} /> : !rows ? <LoadingState label="Loading messages…" /> : (
          <div className="in" style={{ display: "grid", gap: 12 }}>
            {!rows.length && <div className="kd-empty">💬<br />You have not sent any message yet</div>}
            {rows.map((m) => (
              <div key={m.id} style={{ border: "1px solid #e4e9f2", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><b>{m.subject}</b><small style={{ color: "#8a94a6" }}>{when(m.createdOn)}</small></div>
                <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.text}</p>
                {m.reply
                  ? <div style={{ marginTop: 10, background: "#e8f8ee", borderRadius: 10, padding: "10px 12px" }}><small style={{ color: "#15803d", fontWeight: 600 }}>Reply from institute · {when(m.repliedOn)}</small><div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.reply}</div></div>
                  : <small style={{ display: "block", marginTop: 8, color: "#b45309" }}>⏳ Waiting for reply</small>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
