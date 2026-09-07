type EmptyStateProps = {
  title: string;
  message: string;
  className?: string;
  style?: React.CSSProperties;
};

export function EmptyState({ title, message, className, style }: EmptyStateProps) {
  return (
    <div className={className ?? "empty-state"} style={style}>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
