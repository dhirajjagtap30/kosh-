import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "../store";
import PageHeader from "../components/PageHeader";
import { env } from "../../config/env";

export default function Settings() {
  const { settings, updateSettings, resetData } = useDashboard();
  const navigate = useNavigate();
  const [f, setF] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => {
    setF({ ...f, [k]: v });
    setSaved(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    const n = Number(f.lowScoreBelow);
    if (!f.institute.trim()) return setErr("Institute name is required.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr("Enter a valid email address.");
    if (!(n >= 1 && n <= 100)) return setErr("Low-score limit must be between 1 and 100.");
    setErr("");
    setBusy(true);
    const res = await updateSettings({ ...f, institute: f.institute.trim(), lowScoreBelow: n });
    setBusy(false);
    if (res.ok) setSaved(true);
    else setErr(res.error);
  };

  return (
    <>
      <PageHeader title="Settings" sub="Institute profile and alert preferences." />
      <div className="db-cols even">
        <form className="kw-panel" onSubmit={save} noValidate>
          <h3>Institute profile</h3>
          <label className="db-field">Institute name
            <input className="db-input" value={f.institute} onChange={(e) => set("institute", e.target.value)} />
          </label>
          <div className="db-row2">
            <label className="db-field">Email
              <input className="db-input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
            </label>
            <label className="db-field">Mobile
              <input className="db-input" inputMode="numeric" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
          </div>
          <label className="db-field">Flag students whose average is below (%)
            <input className="db-input" type="number" min="1" max="100" value={f.lowScoreBelow} onChange={(e) => set("lowScoreBelow", e.target.value)} />
          </label>
          <label className="db-check"><input type="checkbox" checked={f.notifyEmail} onChange={(e) => set("notifyEmail", e.target.checked)} />Email me when results are ready</label>
          <label className="db-check"><input type="checkbox" checked={f.notifyLowScore} onChange={(e) => set("notifyLowScore", e.target.checked)} />Alert me about low-score students</label>
          {err && <p className="db-err" role="alert">{err}</p>}
          {saved && <p className="kw-ok" role="status" style={{ marginTop: 12 }}>Settings saved.</p>}
          <div style={{ marginTop: 16 }}><button type="submit" className="kw-btn" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
        </form>

        <section className="kw-panel">
          <h3>Account</h3>
          <p className="db-muted">Sign out of the dashboard and return to the website.</p>
          <button type="button" className="kw-btn dark" onClick={() => navigate("/")}>Logout</button>
          {env.USE_MOCK && <>
          <h3 style={{ marginTop: 28 }}>Demo data</h3>
          <p className="db-muted">Restore the sample tests and students. Your changes in this browser will be lost.</p>
          <button type="button" className="kw-btn db-btn-danger"
            onClick={async () => {
              if (window.confirm("Reset all dashboard data to the sample data?")) {
                const res = await resetData();
                if (!res.ok) return;
                setF({ institute: "Jai Gajanan Coaching Classes", email: "admin@example.com", phone: "", lowScoreBelow: 40, notifyEmail: true, notifyLowScore: true });
                setSaved(false);
              }
            }}>
            Reset demo data
          </button>
          </>}
        </section>
      </div>
    </>
  );
}
