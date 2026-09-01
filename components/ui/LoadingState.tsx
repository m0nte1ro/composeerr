type LoadingStateProps = {
  title: string;
  message: string;
  className?: string;
};

export function LoadingState({ title, message, className }: LoadingStateProps) {
  return (
    <div className={className ?? "empty-state"}>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
