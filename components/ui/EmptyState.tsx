type EmptyStateProps = {
  title: string;
  message: string;
  className?: string;
};

export function EmptyState({ title, message, className }: EmptyStateProps) {
  return (
    <div className={className ?? "empty-state"}>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
