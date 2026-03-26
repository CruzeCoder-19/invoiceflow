import { Badge } from "@/components/ui/Badge";
import type { InvoiceStatus } from "@/types";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "secondary" }
> = {
  DRAFT: { label: "Draft", variant: "default" },
  SENT: { label: "Sent", variant: "info" },
  PAID: { label: "Paid", variant: "success" },
  OVERDUE: { label: "Overdue", variant: "danger" },
  CANCELLED: { label: "Cancelled", variant: "warning" },
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.DRAFT;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
