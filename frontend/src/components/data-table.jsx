export function DataTable({ columns, rows, meta, onPage, caption = 'Records' }) {
  return (
    <>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '-')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta && (
        <div className="pagination">
          <span>
            {meta.total} records &middot; Page {meta.page} of {Math.max(1, meta.totalPages)}
          </span>
          <div>
            <button
              className="outline"
              disabled={meta.page <= 1}
              onClick={() => onPage(meta.page - 1)}
            >
              Previous
            </button>
            <button
              className="outline"
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPage(meta.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
