import { useState } from "react";
import { selfAttendanceService, getErrorMessage } from "../services";
import MyAttendance from "./MyAttendance";

/* "Attendance" tab: one-tap "Mark my attendance" for today + the month calendar below. */
export default function StudentAttendance() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [ver, setVer] = useState(0);

  const mark = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await selfAttendanceService.markToday();
      setMsg({ ok: true, text: `Attendance marked: ${r.status}${r.inTime ? ` at ${r.inTime}` : ""}. Have a great day!` });
      setVer((v) => v + 1);
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e) }); } finally { setBusy(false); }
  };
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  return (
    <div className="kd-full" style={{ display: "grid", gap: 20 }}>
      <section className="kd-card">
        <h3>Mark Attendance</h3>
        <div className="in" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <div><b style={{ fontSize: 18 }}>🗓️ {today}</b><div style={{ color: "#3b4660", fontSize: 14, marginTop: 4 }}>Tap the button once you reach the class. You can mark only once a day.</div></div>
          <button type="button" className="kw-btn" disabled={busy} onClick={mark}>{busy ? "Marking…" : "✅ Mark my attendance"}</button>
        </div>
        {msg && <p role="alert" style={{ margin: 0, padding: "0 20px 18px", fontWeight: 600, color: msg.ok ? "#15803d" : "#b45309" }}>{msg.text}</p>}
      </section>
      <section className="kd-card">
        <h3>My Attendance</h3>
        <div className="in"><MyAttendance key={ver} who="student" /></div>
      </section>
    </div>
  );
}
