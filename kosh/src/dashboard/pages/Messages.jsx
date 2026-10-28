import { useState } from "react";
import { messageService, getErrorMessage } from "../../services";
import { useCollection, Gate } from "../useCollection";
import PageHeader from "../components/PageHeader";

const when = (d) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/* Dashboard -> Messages: what students wrote from Student Dashboard -> Send Message. Reply here; the student sees it there. */
export default function Messages() {
  const c = useCollection(messageService);
  const [draft, setDraft] = useState({});
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("open");

  const reply = async (m) => {
    const text = (draft[m.id] || "").trim();
    if (!text) return setErr("Write a reply first.");
    setErr("");
    try {
      await messageService.reply(m.id, text);
      await c.load();
      setDraft((d) => ({ ...d, [m.id]: "" }));
    } catch (e) { setErr(getErrorMessage(e)); }
  };
  const rows = (c.rows || []).filter((m) => filter === "all" || (filter === "open" ? !m.reply : Boolean(m.reply)));
  const waiting = (c.rows || []).filter((m) => !m.reply).length;

  return (
    <>
      <PageHeader title="Messages" sub={`Messages from students and parents. ${waiting} waiting for a reply.`}>
        <select className="db-input" aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="open">Waiting for reply</option><option value="done">Replied</option><option value="all">All</option>
        </select>
      </PageHeader>
      <Gate cs={c} label="Loading messages…">
        {err && <p className="db-err" role="alert">{err}</p>}
        <div style={{ display: "grid", gap: 14 }}>
          {!rows.length && <div style={{ textAlign: "center", padding: 30, background: "#fff", border: "1px solid #e4e9f2", borderRadius: 14 }}>No messages here.</div>}
          {rows.map((m) => (
            <div key={m.id} style={{ padding: 16, background: "#fff", border: "1px solid #e4e9f2", borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <b>{m.subject}</b><small className="db-muted">{m.fromRole === "Parent" ? `👨‍👩‍👧 ${m.senderName} — child: ${m.studentName}` : m.studentName} · Std {m.standard} · {when(m.createdOn)}</small>
              </div>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.text}</p>
              {m.reply && <p style={{ background: "#e8f8ee", borderRadius: 10, padding: "8px 12px", whiteSpace: "pre-wrap" }}><small>Replied {when(m.repliedOn)}</small><br />{m.reply}</p>}
              <textarea className="db-input" rows={2} placeholder={m.reply ? "Update your reply…" : "Write a reply…"} value={draft[m.id] || ""} onChange={(e) => setDraft((d) => ({ ...d, [m.id]: e.target.value }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" className="kw-btn" onClick={() => reply(m)}>{m.reply ? "Update reply" : "Send reply"}</button>
                <button type="button" className="kw-btn db-btn-line" onClick={() => c.remove(m, "this message")}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Gate>
    </>
  );
}
