import { useMemo, useState } from "react";

/* Reusable table: sortable columns, pagination, optional clickable rows.
   columns: [{ key, label, sortable, sortValue(row), render(row), align }] — rows need an `id`. */
export default function DataTable({ columns, rows, pageSize = 8, onRowClick, emptyText = "Nothing to show.", initialSort }) {
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const val = (r) => (col && col.sortValue ? col.sortValue(r) : r[sort.key]);
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return c * dir;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * pageSize;
  const slice = sorted.slice(start, start + pageSize);

  const toggle = (key) => {
    setPage(1);
    setSort((s) => (s && s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  return (
    <div className="db-table-wrap">
      <div className="db-table-scroll">
        <table className="db-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={c.align ? { textAlign: c.align } : undefined}
                  aria-sort={sort && sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {c.sortable ? (
                    <button type="button" className="db-th-btn" onClick={() => toggle(c.key)}>
                      {c.label}
                      <span aria-hidden="true">{sort && sort.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : " ↕"}</span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr><td colSpan={columns.length} className="db-empty">{emptyText}</td></tr>
            ) : (
              slice.map((r, i) => (
                <tr
                  key={r.id != null ? r.id : i}
                  className={onRowClick ? "click" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  onKeyDown={onRowClick ? (e) => e.key === "Enter" && e.target === e.currentTarget && onRowClick(r) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} style={c.align ? { textAlign: c.align } : undefined}>
                      {c.render ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <div className="db-pager db-no-print">
          <span>Showing {start + 1}–{Math.min(start + pageSize, sorted.length)} of {sorted.length}</span>
          <span className="db-pager-btns">
            <button type="button" className="kw-btn db-btn-sm db-btn-line" disabled={cur === 1} onClick={() => setPage(cur - 1)}>Previous</button>
            <span>Page {cur} of {pages}</span>
            <button type="button" className="kw-btn db-btn-sm db-btn-line" disabled={cur === pages} onClick={() => setPage(cur + 1)}>Next</button>
          </span>
        </div>
      )}
    </div>
  );
}
