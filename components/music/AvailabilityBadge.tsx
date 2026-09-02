import { Badge } from "@/components/ui/Badge";

type AvailabilityBadgeProps = {
  status: "available" | "requested" | "none";
  title?: string;
};

export function AvailabilityBadge({ status, title }: AvailabilityBadgeProps) {
  if (status === "available") {
    return (
      <Badge className="library-badge" title={title ?? "In Lidarr"}>
        ✓
      </Badge>
    );
  }

  if (status === "requested") {
    return <Badge className="requested-badge">Requested</Badge>;
  }

  return <span className="result-chevron">›</span>;
}
