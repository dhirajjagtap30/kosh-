import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../services";
import { LoadingState, ErrorState, ErrorBanner } from "../components/StatusViews";

/* Loads a list through a service and gives save (create/update) + remove helpers.
   save() resolves { ok:true, item } or { ok:false, error } so a form can show the message. */
export function useCollection(service) {
  const [rows, setRows] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [actionErr, setActionErr] = useState("");

  const load = useCallback(async () => {
    setLoadErr("");
    try { setRows(await service.list()); } catch (e) { setLoadErr(getErrorMessage(e)); }
  }, [service]);
  useEffect(() => { load(); }, [load]);

  const save = async (id, obj) => {
    try {
      const item = id ? await service.update(id, obj) : await service.create(obj);
      setRows((r) => (id ? r.map((x) => (x.id === id ? item : x)) : [...r, item]));
      return { ok: true, item };
    } catch (e) { return { ok: false, error: getErrorMessage(e) }; }
  };

  const remove = async (row, label) => {
    if (!window.confirm(`Delete ${label}?`)) return;
    setActionErr("");
    try { await service.remove(row.id); setRows((r) => r.filter((x) => x.id !== row.id)); } catch (e) { setActionErr(getErrorMessage(e)); }
  };

  return { rows, loadErr, actionErr, setActionErr, load, save, remove };
}

/* Shows loading / error state, otherwise the page body. `cs` = one or more useCollection results. */
export function Gate({ cs, label = "Loading…", children }) {
  const list = [].concat(cs);
  const bad = list.find((c) => c.loadErr);
  if (bad) return <ErrorState message={bad.loadErr} onRetry={bad.load} />;
  if (list.some((c) => !c.rows)) return <LoadingState label={label} />;
  return (
    <>
      {list.map((c, i) => <ErrorBanner key={i} message={c.actionErr} onClose={() => c.setActionErr("")} />)}
      {children}
    </>
  );
}

/* Small helper used by the forms: a modal form with error + busy handling. */
export function useForm(initial, onSubmit, validate) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setErr(""); };
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const msg = validate && validate(f);
    if (msg) return setErr(msg);
    setBusy(true);
    const res = await onSubmit(f);
    setBusy(false);
    if (res && !res.ok) setErr(res.error);
  };
  return { f, setF, set, err, busy, submit };
}
