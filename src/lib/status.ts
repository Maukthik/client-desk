import type { DeliverableStatus, InvoiceStatus, ProjectStatus } from "@prisma/client";

export type Tone = "neutral" | "brand" | "blue" | "amber" | "green" | "red" | "violet";

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  PLANNING: { label: "Planning", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "blue" },
  IN_REVIEW: { label: "In review", tone: "violet" },
  ON_HOLD: { label: "On hold", tone: "amber" },
  COMPLETED: { label: "Completed", tone: "green" },
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = ["PLANNING", "IN_PROGRESS", "IN_REVIEW", "ON_HOLD", "COMPLETED"];

export const DELIVERABLE_STATUS: Record<DeliverableStatus, { label: string; tone: Tone }> = {
  PENDING_REVIEW: { label: "Awaiting approval", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "red" },
};

export const INVOICE_STATUS: Record<InvoiceStatus | "OVERDUE", { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  OPEN: { label: "Open", tone: "blue" },
  OVERDUE: { label: "Overdue", tone: "red" },
  PAID: { label: "Paid", tone: "green" },
  VOID: { label: "Void", tone: "neutral" },
};

export const ROLE_LABEL = { OWNER: "Owner", MEMBER: "Team member", CLIENT: "Client" } as const;
