export default function StatCard({ icon, label, value, note, tone = "blue" }) {
  return (
    <div className={`kw-stat db-stat ${tone}`}>
      <span className="db-stat-ic" aria-hidden="true">{icon}</span>
      <b>{value}</b>
      <span>{label}</span>
      {note && <small className="db-muted">{note}</small>}
    </div>
  );
}
