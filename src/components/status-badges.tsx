import type { DeliverableStatus, InvoiceStatus, ProjectStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { DELIVERABLE_STATUS, INVOICE_STATUS, PROJECT_STATUS } from "@/lib/status";

export function ProjectBadge({ status }: { status: ProjectStatus }) {
  const s = PROJECT_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function DeliverableBadge({ status }: { status: DeliverableStatus }) {
  const s = DELIVERABLE_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function InvoiceBadge({ status, dueDate }: { status: InvoiceStatus; dueDate: Date }) {
  const key = status === "OPEN" && dueDate < new Date() ? "OVERDUE" : status;
  const s = INVOICE_STATUS[key];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
