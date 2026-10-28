import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BATCHES, SUBJECTS } from "./data";
import { avg, fmtShort } from "./utils";
import { studentService, testService, resultService, settingsService, notificationService, demoService, getErrorMessage } from "../services";
import { LoadingState, ErrorState } from "../components/StatusViews";

/* Dashboard data layer.
   - Data is loaded through src/services (axios) — mock API or Django, depending on .env.
   - Every action is async and returns { ok:true } or { ok:false, error } (it never throws),
     so a page can show the error next to its form. Actions started from buttons (delete, publish…)
     report failures in the red banner at the top of the dashboard (`actionError`). */

const Ctx = createContext(null);
export const useDashboard = () => useContext(Ctx);

export function DashboardProvider({ children }) {
  const [data, setData] = useState(null); // { students, tests, results, settings, notifications }
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const loadId = useRef(0);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoadError("");
    try {
      const [students, tests, results, settings, notifications] = await Promise.all([
        studentService.list(),
        testService.list(),
        resultService.list(),
        settingsService.get(),
        notificationService.list(),
      ]);
      if (id === loadId.current) setData({ students, tests, results, settings, notifications });
    } catch (e) {
      if (id === loadId.current) setLoadError(getErrorMessage(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const actions = useMemo(() => {
    const patch = (fn) => setData((p) => (p ? fn(p) : p));

    // Results/notifications are computed by the server, so re-read them quietly after changes.
    const refreshDerived = async () => {
      try {
        const [results, notifications] = await Promise.all([resultService.list(), notificationService.list()]);
        patch((p) => ({ ...p, results, notifications }));
      } catch { /* keep what we have; the next full load will fix it */ }
    };

    // report=true -> show failures in the dashboard banner; report=false -> caller shows result.error itself.
    const run = async (fn, report) => {
      setActionError("");
      try {
        await fn();
        return { ok: true };
      } catch (e) {
        const error = getErrorMessage(e);
        if (report) setActionError(error);
        return { ok: false, error };
      }
    };

    return {
      addTest: (t) => run(async () => {
        const created = await testService.create(t);
        patch((p) => ({ ...p, tests: [...p.tests, created] }));
        refreshDerived();
      }, false),

      deleteTest: (id) => run(async () => {
        await testService.remove(id);
        patch((p) => ({ ...p, tests: p.tests.filter((t) => t.id !== id), results: p.results.filter((r) => r.testId !== id) }));
        refreshDerived();
      }, true),

      setTestStatus: (id, status) => run(async () => {
        const updated = await testService.setStatus(id, status);
        patch((p) => ({ ...p, tests: p.tests.map((t) => (t.id === id ? { ...t, ...updated } : t)) }));
        refreshDerived();
      }, true),

      setResultAnnounced: (id, announced) => run(async () => {
        const updated = await testService.setAnnounced(id, announced);
        patch((p) => ({ ...p, tests: p.tests.map((t) => (t.id === id ? { ...t, ...updated } : t)) }));
      }, true),

      assignBatches: (id, batchIds) => run(async () => {
        const updated = await testService.setBatches(id, batchIds);
        patch((p) => ({ ...p, tests: p.tests.map((t) => (t.id === id ? { ...t, ...updated } : t)) }));
      }, false),

      resetTest: (id) => run(async () => {
        const updated = await testService.resetAll(id);
        patch((p) => ({ ...p, tests: p.tests.map((t) => (t.id === id ? { ...t, ...updated } : t)) }));
      }, true),

      refreshTests: () => run(async () => {
        const fresh = await testService.list();
        patch((p) => ({ ...p, tests: fresh }));
      }, false),

      addStudent: (s) => run(async () => {
        const created = await studentService.create(s);
        patch((p) => ({ ...p, students: [...p.students, created] }));
        refreshDerived();
      }, false),

      deleteStudent: (id) => run(async () => {
        await studentService.remove(id);
        patch((p) => ({ ...p, students: p.students.filter((s) => s.id !== id), results: p.results.filter((r) => r.studentId !== id) }));
        refreshDerived();
      }, true),

      updateSettings: (s) => run(async () => {
        const saved = await settingsService.update(s);
        patch((p) => ({ ...p, settings: { ...p.settings, ...saved } }));
      }, false),

      markAllRead: () => run(async () => {
        await notificationService.markAllRead();
        patch((p) => ({ ...p, notifications: p.notifications.map((n) => ({ ...n, read: true })) }));
      }, true),

      resetData: () => run(async () => {
        await demoService.reset();
        await load();
      }, true),

      clearActionError: () => setActionError(""),
    };
  }, [load]);

  const value = useMemo(() => {
    if (!data) return null;
    const { students, tests, results } = data;

    const byStudent = {};
    const byTest = {};
    results.forEach((r) => {
      (byStudent[r.studentId] = byStudent[r.studentId] || []).push(r);
      (byTest[r.testId] = byTest[r.testId] || []).push(r);
    });

    const studentStats = {};
    students.forEach((s) => {
      const list = byStudent[s.id] || [];
      studentStats[s.id] = {
        taken: list.length,
        avg: list.length ? avg(list.map((r) => r.score)) : null,
        best: list.length ? Math.max(...list.map((r) => r.score)) : null,
        rank: null,
      };
    });
    students
      .filter((s) => studentStats[s.id].avg !== null)
      .sort((a, b) => studentStats[b.id].avg - studentStats[a.id].avg)
      .forEach((s, i) => {
        studentStats[s.id].rank = i + 1;
      });

    const testStats = {};
    tests.forEach((t) => {
      const list = byTest[t.id] || [];
      const scores = list.map((r) => r.score);
      testStats[t.id] = {
        appeared: list.length,
        avg: list.length ? avg(scores) : null,
        high: list.length ? Math.max(...scores) : null,
        low: list.length ? Math.min(...scores) : null,
      };
    });

    const completed = tests.filter((t) => t.status === "Completed").sort((a, b) => a.date.localeCompare(b.date));
    const trend = completed.map((t) => ({ label: fmtShort(t.date), value: testStats[t.id].avg || 0 }));
    const byId = new Map(students.map((s) => [s.id, s]));

    return {
      ...data,
      ...actions,
      actionError,
      studentStats,
      testStats,
      trend,
      overall: {
        totalStudents: students.length,
        completed: completed.length,
        upcoming: tests.filter((t) => t.status !== "Completed").length,
        avgScore: avg(results.map((r) => r.score)),
      },
      subjectAvg: SUBJECTS.map((name) => ({ label: name, value: avg(results.map((r) => r.subjects[name]).filter((v) => v != null)) })),
      batchAvg: BATCHES.map((b) => ({
        label: b,
        value: avg(results.filter((r) => byId.get(r.studentId) && byId.get(r.studentId).batch === b).map((r) => r.score)),
      })),
    };
  }, [data, actions, actionError]);

  if (!data) {
    return loadError
      ? <ErrorState fullPage message={loadError} onRetry={load} />
      : <LoadingState fullPage label="Loading dashboard…" />;
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
