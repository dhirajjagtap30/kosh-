import { round1 } from "../utils";

const PALETTE = ["#2563eb", "#0ea5e9", "#38bdf8"];

/* Bars reuse the site's existing .kw-chart look. */
export function BarChart({ data, max = 100, suffix = "" }) {
  if (!data.length) return <p className="db-muted">No data yet.</p>;
  return (
    <div>
      <div className="kw-chart">
        {data.map((d, i) => (
          <div
            key={`${d.label}-${i}`}
            title={`${d.label}: ${round1(d.value)}${suffix}`}
            style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: PALETTE[i % 3] }}
          >
            <span className="db-bar-val">{Math.round(d.value)}{suffix}</span>
          </div>
        ))}
      </div>
      <div className="db-chart-labels">
        {data.map((d, i) => <span key={`${d.label}-${i}`}>{d.label}</span>)}
      </div>
    </div>
  );
}

export function LineChart({ data }) {
  if (!data.length) return <p className="db-muted">No data yet.</p>;
  const W = 600, H = 220, L = 34, R = 14, T = 14, B = 30;
  const n = data.length;
  const x = (i) => (n === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (1 - Math.min(100, Math.max(0, v)) / 100) * (H - T - B);
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const line = pts.map((p) => p.join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Score trend chart">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e6eaf2" />
          <text x={L - 6} y={y(g) + 4} fontSize="11" textAnchor="end" fill="#5b6577">{g}</text>
        </g>
      ))}
      {n > 1 && <polygon points={`${x(0)},${y(0)} ${line} ${x(n - 1)},${y(0)}`} fill="#2563eb" opacity=".08" />}
      {n > 1 && <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" />}
      {pts.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r="5" fill="#2563eb">
          <title>{`${data[i].label}: ${round1(data[i].value)}%`}</title>
        </circle>
      ))}
      {data.map((d, i) => (
        <text key={i} x={x(i)} y={H - 8} fontSize="11" textAnchor="middle" fill="#5b6577">{d.label}</text>
      ))}
    </svg>
  );
}

export function Donut({ segments, centerValue, centerLabel }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <div className="db-donut">
      <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Answer breakdown">
        <circle cx="90" cy="90" r={r} fill="none" stroke="#e6eaf2" strokeWidth="18" />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={s.label} cx="90" cy="90" r={r} fill="none" stroke={s.color} strokeWidth="18"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 90 90)" />
          );
          acc += len;
          return el;
        })}
        <text x="90" y="92" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0a2463">{centerValue}</text>
        <text x="90" y="112" textAnchor="middle" fontSize="12" fill="#5b6577">{centerLabel}</text>
      </svg>
      <ul className="db-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span><i style={{ background: s.color }} />{s.label}</span>
            <b>{round1(s.value)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProgressBar({ label, value, color = "#2563eb" }) {
  return (
    <div className="db-prog">
      <div className="db-prog-top"><span>{label}</span><b>{round1(value)}%</b></div>
      <div className="db-prog-bar"><div style={{ width: `${Math.min(100, Math.max(1, value))}%`, background: color }} /></div>
    </div>
  );
}
