export default function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="empty-state" style={{ display: 'flex' }}>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
    </div>
  );
}
