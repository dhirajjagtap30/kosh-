/* DEMO ONLY: a few sample notices so the Parent Dashboard -> Notices tab is not empty on first run. Runs once per browser. */
export function seedNotices(db) {
  if (db.noticesSeeded) return false;
  db.notices = db.notices || [];
  const branch_id = (db.branches.find((b) => b.id === 1) || db.branches[0] || { id: 1 }).id;
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  [
    { title: "Parent-Teacher Meeting", text: "A parent-teacher meeting is arranged this Saturday, 11:00 AM to 1:00 PM at the institute. Please attend and discuss your child's progress with the teachers.", pinned: true, d: 1 },
    { title: "Fee reminder", text: "Parents are requested to clear the pending fee instalment before the 10th of this month. Please contact the office for any query.", pinned: false, d: 3 },
    { title: "Diwali holidays", text: "The institute will remain closed for the Diwali holidays. Classes will restart on the next Monday after the vacation.", pinned: false, d: 6 },
  ].forEach((n, i) => db.notices.push({ id: i + 1, branch_id, title: n.title, text: n.text, audience: "Parents", standard: "", pinned: n.pinned, created_on: ago(n.d) }));
  db.noticesSeeded = true;
  return true;
}
