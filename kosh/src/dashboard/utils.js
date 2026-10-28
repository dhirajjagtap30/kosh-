export const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
export const round1 = (n) => Math.round(n * 10) / 10;
export const pct = (n) => `${round1(n).toFixed(1)}%`;
export const tone = (v) => (v >= 60 ? "good" : v >= 40 ? "mid" : "low");
export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
export const fmtShort = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

/* Download rows (array of arrays) as a CSV file; Excel opens CSV directly. */
export function downloadCSV(filename, rows) {
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Ranked result rows for one test. */
export function buildTestRows(test, results, students) {
  const byId = new Map(students.map((s) => [s.id, s]));
  return results
    .filter((r) => r.testId === test.id)
    .sort((a, b) => b.score - a.score)
    .map((r, i) => {
      const s = byId.get(r.studentId);
      return {
        id: r.studentId,
        rank: i + 1,
        name: s ? s.name : "Unknown",
        batch: s ? s.batch : "",
        marks: r.marks,
        total: test.totalMarks,
        score: r.score,
        ...r.subjects,
      };
    });
}

/* Result rows for one student across all completed tests. */
export function buildStudentRows(studentId, results, tests) {
  return results
    .filter((r) => r.studentId === studentId)
    .map((r) => {
      const t = tests.find((x) => x.id === r.testId);
      const rank = results.filter((x) => x.testId === r.testId && x.score > r.score).length + 1;
      return { id: r.testId, name: t ? t.name : "Test", date: t ? t.date : "", marks: r.marks, total: t ? t.totalMarks : 0, score: r.score, rank, ...r.subjects };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
