export default function LoadingState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="loading-state" style={{ display: 'flex' }}>
      <div className="spinner" />
      <div className="loading-text">{text}</div>
      <div className="loading-sub">{sub}</div>
    </div>
  );
}
