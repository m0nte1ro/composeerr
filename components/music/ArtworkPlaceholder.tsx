type ArtworkShape = "square" | "circle";

type ArtworkPlaceholderProps = {
  label: string;
  className?: string;
  shape?: ArtworkShape;
};

export function ArtworkPlaceholder({
  label,
  className,
  shape = "square",
}: ArtworkPlaceholderProps) {
  const shapeClass = shape === "circle" ? "artwork-circle" : "";

  return (
    <div className={[className, shapeClass].filter(Boolean).join(" ")}>
      {label.charAt(0).toUpperCase()}
    </div>
  );
}
