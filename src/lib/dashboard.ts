import "server-only";
import { db } from "./db";
import { PROJECT_STATUS_ORDER } from "./status";

const MONTHS = 12;

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Collected revenue per calendar month (UTC) for the trailing 12 months. */
export async function revenueByMonth(agencyId: string, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));
  const paid = await db.invoice.findMany({
    where: { agencyId, status: "PAID", paidAt: { gte: start } },
    select: { total: true, paidAt: true },
  });
  const buckets = new Map<string, number>();
  for (const inv of paid) {
    const key = monthKey(inv.paidAt!);
    buckets.set(key, (buckets.get(key) ?? 0) + inv.total);
  }
  return Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = monthKey(d);
    return {
      key,
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      fullLabel: d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      value: buckets.get(key) ?? 0,
    };
  });
}

export async function teamDashboard(agencyId: string) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [revenue, thisMonth, lastMonth, open, overdue, statusGroups, pendingDeliverables, overdueInvoices, activity, clientCount] =
    await Promise.all([
      revenueByMonth(agencyId, now),
      db.invoice.aggregate({ where: { agencyId, status: "PAID", paidAt: { gte: monthStart } }, _sum: { total: true } }),
      db.invoice.aggregate({ where: { agencyId, status: "PAID", paidAt: { gte: lastMonthStart, lt: monthStart } }, _sum: { total: true } }),
      db.invoice.aggregate({ where: { agencyId, status: "OPEN" }, _sum: { total: true }, _count: true }),
      db.invoice.aggregate({ where: { agencyId, status: "OPEN", dueDate: { lt: now } }, _sum: { total: true }, _count: true }),
      db.project.groupBy({ by: ["status"], where: { agencyId }, _count: true }),
      db.deliverable.findMany({
        where: { status: { in: ["PENDING_REVIEW", "CHANGES_REQUESTED"] }, project: { agencyId } },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { project: { select: { id: true, name: true, client: { select: { name: true } } } } },
      }),
      db.invoice.findMany({
        where: { agencyId, status: "OPEN" },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { client: { select: { name: true } }, project: { select: { name: true } } },
      }),
      db.activity.findMany({
        where: { agencyId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: { select: { name: true } } },
      }),
      db.client.count({ where: { agencyId } }),
    ]);

  const statusCounts = PROJECT_STATUS_ORDER.map((status) => ({
    status,
    count: statusGroups.find((g) => g.status === status)?._count ?? 0,
  }));
  const yearToDate = revenue.filter((r) => r.key.startsWith(String(now.getUTCFullYear()))).reduce((s, r) => s + r.value, 0);

  return {
    revenue,
    yearToDate,
    trailing12: revenue.reduce((s, r) => s + r.value, 0),
    thisMonth: thisMonth._sum.total ?? 0,
    lastMonth: lastMonth._sum.total ?? 0,
    outstanding: { amount: open._sum.total ?? 0, count: open._count },
    overdue: { amount: overdue._sum.total ?? 0, count: overdue._count },
    statusCounts,
    activeProjects: statusCounts.filter((s) => s.status !== "COMPLETED").reduce((n, s) => n + s.count, 0),
    pendingDeliverables,
    upcomingInvoices: overdueInvoices,
    activity,
    clientCount,
  };
}
