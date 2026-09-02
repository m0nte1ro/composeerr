type ErrorStateProps = {
  title: string;
  message: string;
  className?: string;
};

export function ErrorState({ title, message, className }: ErrorStateProps) {
  return (
    <div className={className ?? "empty-state"}>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
