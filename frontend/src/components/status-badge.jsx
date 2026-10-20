export function StatusBadge({ status }) {
  return (
    <span className={'badge badge-' + status}>
      <span aria-hidden="true" className="status-dot" />
      {String(status || 'unknown').replaceAll('_', ' ')}
    </span>
  );
}
