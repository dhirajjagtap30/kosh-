/* DEMO ONLY: gives every demo student a Biometric ID (101, 102, ...) and ~3 weeks of sample attendance so the
   Attendance report is not empty on first run. Runs once per browser. Delete with the rest of src/mocks when the backend is live. */
const p2 = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

export function seedAttendance(db) {
  if (db.attendanceSeeded) return false;
  db.attendance = db.attendance || [];
  let id = db.attendance.reduce((m, a) => Math.max(m, a.id), 0);
  db.registrations.forEach((r) => { if (!r.biometric_id) r.biometric_id = String(100 + r.id); });
  const now = new Date();
  for (let back = 1; back <= 21; back++) {
    const d = new Date(now); d.setDate(d.getDate() - back);
    if (d.getDay() === 0) continue; // Sunday = holiday
    db.registrations.filter((r) => r.status !== "Inactive").forEach((r) => {
      const roll = (r.id * 7 + back * 13 + back * back) % 20; // deterministic "random"
      const status = roll === 0 || roll === 11 ? "Absent" : roll === 5 ? "Leave" : roll === 8 || roll === 15 ? "Late" : "Present";
      const rec = { id: ++id, branch_id: r.branch_id, student_id: r.id, date: iso(d), status, in_time: "", out_time: "", source: "Manual", note: status === "Leave" ? "Informed by parent" : "" };
      if (status === "Present" || status === "Late") {
        rec.in_time = status === "Late" ? `09:${p2(35 + (roll % 20))}` : `08:${p2(40 + (roll % 15))}`;
        rec.out_time = `13:${p2(5 + (roll % 40))}`;
        rec.source = "Biometric";
      }
      db.attendance.push(rec);
    });
  }
  db.attendanceSeeded = true;
  return true;
}
