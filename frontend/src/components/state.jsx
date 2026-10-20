export function State({ loading, error, retry, empty, children }) {
  if (loading)
    return (
      <div className="state" role="status">
        <span className="spinner" /> Loading records...
      </div>
    );
  if (error)
    return (
      <div className="state error" role="alert">
        <strong>We could not complete that request</strong>
        <p>{error}</p>
        {retry && <button onClick={retry}>Try again</button>}
      </div>
    );
  if (empty)
    return (
      <div className="state">
        <span className="empty-icon">&#9638;</span>
        <strong>No records yet</strong>
        <p>Records will appear here when they are available.</p>
      </div>
    );
  return children;
}
