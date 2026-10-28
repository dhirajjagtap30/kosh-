export default function PageHeader({ title, sub, children }) {
  return (
    <div className="db-page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="db-muted">{sub}</p>}
      </div>
      {children && <div className="db-head-actions db-no-print">{children}</div>}
    </div>
  );
}
