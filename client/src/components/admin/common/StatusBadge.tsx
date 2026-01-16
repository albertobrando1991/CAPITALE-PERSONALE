
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "active" | "inactive" | "pending" | "suspended" | "completed" | "error" | "warning" | "success";

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let colorClass = "";

  // Auto-detect type from status string if not provided
  const normalizedStatus = status.toLowerCase();
  const effectiveType = type || 
    (normalizedStatus.includes("active") || normalizedStatus.includes("success") || normalizedStatus.includes("completed") ? "success" :
     normalizedStatus.includes("inactive") || normalizedStatus.includes("error") || normalizedStatus.includes("suspended") ? "error" :
     normalizedStatus.includes("pending") || normalizedStatus.includes("warning") ? "warning" : "default");

  switch (effectiveType) {
    case "success":
    case "active":
    case "completed":
      variant = "default";
      colorClass = "bg-green-100 text-green-800 hover:bg-green-200 border-green-200";
      break;
    case "error":
    case "suspended":
    case "inactive":
      variant = "destructive";
      colorClass = "bg-red-100 text-red-800 hover:bg-red-200 border-red-200";
      break;
    case "warning":
    case "pending":
      variant = "secondary";
      colorClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200";
      break;
    default:
      variant = "secondary";
      colorClass = "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200";
  }

  return (
    <Badge 
      variant={variant} 
      className={cn("font-medium shadow-none", colorClass, className)}
    >
      {status}
    </Badge>
  );
}
