export default function ErrorState({
  message,
  code,
  onRetry,
}: {
  message: string;
  code?: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="error-state" style={{ display: 'flex' }}>
      <div className="error-title">Could not fetch ads</div>
      <div className="error-msg">{message}</div>
      {code ? <div className="error-code">{code}</div> : null}
      <button className="btn-secondary" style={{ marginTop: 8 }} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
