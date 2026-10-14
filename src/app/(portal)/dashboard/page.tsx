import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CircleDollarSign, CreditCard, FileCheck2, FolderKanban, Plus, Receipt, Wallet } from "lucide-react";
import { ActivityFeed } from "@/components/activity-feed";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBreakdown } from "@/components/dashboard/status-breakdown";
import { ProjectList } from "@/components/project-list";
import { DeliverableBadge, InvoiceBadge } from "@/components/status-badges";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { activityScope, invoiceScope, projectScope, requireViewer, type PortalViewer } from "@/lib/dal";
import { teamDashboard } from "@/lib/dashboard";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate, formatRelative } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const viewer = await requireViewer();
  return viewer.isTeam ? <TeamDashboard viewer={viewer} /> : <ClientDashboard viewer={viewer} />;
}

async function TeamDashboard({ viewer }: { viewer: PortalViewer }) {
  const d = await teamDashboard(viewer.agency.id);
  const currency = viewer.agency.currency;
  const change = d.lastMonth ? (d.thisMonth - d.lastMonth) / d.lastMonth : null;
  const firstName = viewer.user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={`Here's what's happening at ${viewer.agency.name}.`}
        actions={
          <>
            <ButtonLink href="/invoices/new" variant="secondary">
              <Receipt /> New invoice
            </ButtonLink>
            <ButtonLink href="/projects/new">
              <Plus /> New project
            </ButtonLink>
          </>
        }
      />

      {d.clientCount === 0 && (
        <Card className="mb-6 overflow-hidden border-brand-200 bg-gradient-to-br from-brand-50 to-white">
          <CardBody className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-zinc-900">Welcome to ClientDesk 👋</p>
              <p className="mt-1 text-sm text-zinc-600">Start by adding a client and inviting them to their portal. Then create a project and share your first deliverable.</p>
            </div>
            <ButtonLink href="/clients/new">
              <Plus /> Add your first client
            </ButtonLink>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue this month"
          icon={CircleDollarSign}
          value={formatMoney(d.thisMonth, currency)}
          sub={
            change === null ? (
              `${formatMoney(d.lastMonth, currency)} last month`
            ) : (
              <span className="inline-flex items-center gap-1">
                <span className={change >= 0 ? "inline-flex items-center font-medium text-emerald-700" : "inline-flex items-center font-medium text-red-600"}>
                  {change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {Math.abs(Math.round(change * 100))}%
                </span>
                vs {formatMoney(d.lastMonth, currency)} last month
              </span>
            )
          }
        />
        <StatCard
          label="Outstanding"
          icon={Wallet}
          value={formatMoney(d.outstanding.amount, currency)}
          sub={`${d.outstanding.count} unpaid ${d.outstanding.count === 1 ? "invoice" : "invoices"}`}
        />
        <StatCard
          label="Overdue"
          icon={AlertTriangle}
          tone={d.overdue.count ? "alert" : "neutral"}
          value={formatMoney(d.overdue.amount, currency)}
          sub={d.overdue.count ? `${d.overdue.count} past due date` : "Nothing overdue"}
        />
        <StatCard
          label="Active projects"
          icon={FolderKanban}
          value={d.activeProjects}
          sub={`${d.pendingDeliverables.filter((x) => x.status === "PENDING_REVIEW").length} deliverables awaiting approval`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue"
            description={
              <>
                Collected per month · <span className="font-medium text-zinc-700 tabular-nums">{formatMoney(d.trailing12, currency)}</span> in the last 12 months
              </>
            }
          />
          <CardBody>
            <RevenueChart data={d.revenue} currency={currency} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Project status" description={`${d.statusCounts.reduce((n, s) => n + s.count, 0)} projects`} />
          <CardBody className="py-5">
            <StatusBreakdown counts={d.statusCounts} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Deliverables in review" description="Waiting on clients, or needing changes from your team." />
          {d.pendingDeliverables.length ? (
            <ul className="divide-y divide-zinc-100">
              {d.pendingDeliverables.map((item) => (
                <li key={item.id}>
                  <Link href={`/projects/${item.project.id}#${item.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50/70">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{item.title}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {item.project.client.name} · {item.project.name} · {formatRelative(item.updatedAt)}
                      </p>
                    </div>
                    <DeliverableBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileCheck2} title="Nothing in review" description="Deliverables you share with clients will show up here until they're approved." />
          )}
        </Card>
        <Card>
          <CardHeader title="Recent activity" />
          <ActivityFeed items={d.activity} />
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Unpaid invoices" description="Sorted by due date." action={<Link href="/invoices?filter=open" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>} />
        {d.upcomingInvoices.length ? (
          <ul className="divide-y divide-zinc-100">
            {d.upcomingInvoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/invoices/${inv.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50/70">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      {inv.number} <span className="font-normal text-zinc-500">· {inv.client.name}</span>
                    </p>
                    <p className="text-xs text-zinc-500">Due {formatDate(inv.dueDate)}</p>
                  </div>
                  <InvoiceBadge status={inv.status} dueDate={inv.dueDate} />
                  <span className="w-28 text-right text-sm font-medium tabular-nums">{formatMoney(inv.total, inv.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Receipt} title="All invoices are paid" />
        )}
      </Card>
    </>
  );
}

async function ClientDashboard({ viewer }: { viewer: PortalViewer }) {
  const [projects, pending, openInvoices, activity] = await Promise.all([
    db.project.findMany({
      where: { ...projectScope(viewer), status: { not: "COMPLETED" } },
      orderBy: { updatedAt: "desc" },
      include: { client: { select: { name: true } }, deliverables: { select: { status: true } } },
    }),
    db.deliverable.findMany({
      where: { status: "PENDING_REVIEW", project: projectScope(viewer) },
      orderBy: { updatedAt: "desc" },
      include: { project: { select: { id: true, name: true } }, _count: { select: { files: true } } },
    }),
    db.invoice.findMany({ where: { ...invoiceScope(viewer), status: "OPEN" }, orderBy: { dueDate: "asc" } }),
    db.activity.findMany({ where: activityScope(viewer), orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } }),
  ]);
  const balance = openInvoices.reduce((s, i) => s + i.total, 0);
  const currency = viewer.agency.currency;
  const firstName = viewer.user.name.split(" ")[0];
  const nothingToDo = pending.length === 0 && openInvoices.length === 0;

  return (
    <>
      <PageHeader title={`${greeting()}, ${firstName}`} description={`Your portal with ${viewer.agency.name}.`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting your approval" icon={FileCheck2} value={pending.length} sub={pending.length ? "Deliverables ready to review" : "You're all caught up"} />
        <StatCard
          label="Balance due"
          icon={Wallet}
          value={formatMoney(balance, currency)}
          sub={`${openInvoices.length} open ${openInvoices.length === 1 ? "invoice" : "invoices"}`}
          tone={openInvoices.some((i) => i.dueDate < new Date()) ? "alert" : "neutral"}
        />
        <StatCard label="Active projects" icon={FolderKanban} value={projects.length} />
      </div>

      {!nothingToDo && (
        <Card className="mt-6">
          <CardHeader title="Needs your attention" />
          <ul className="divide-y divide-zinc-100">
            {pending.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <FileCheck2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Review “{item.title}”</p>
                  <p className="truncate text-xs text-zinc-500">
                    {item.project.name} · {item._count.files} {item._count.files === 1 ? "file" : "files"} · shared {formatRelative(item.createdAt)}
                  </p>
                </div>
                <ButtonLink href={`/projects/${item.project.id}#${item.id}`} size="sm" variant="secondary">
                  Review
                </ButtonLink>
              </li>
            ))}
            {openInvoices.map((inv) => (
              <li key={inv.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <CreditCard className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    Pay invoice {inv.number} · <span className="tabular-nums">{formatMoney(inv.total, inv.currency)}</span>
                  </p>
                  <p className="text-xs text-zinc-500">Due {formatDate(inv.dueDate)}</p>
                </div>
                <InvoiceBadge status={inv.status} dueDate={inv.dueDate} />
                <ButtonLink href={`/invoices/${inv.id}`} size="sm">
                  Pay now
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Your projects" action={<Link href="/projects?filter=all" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>} />
          {projects.length ? (
            <ProjectList projects={projects} showClient={false} />
          ) : (
            <EmptyState icon={FolderKanban} title="No active projects" description={`${viewer.agency.name} will add projects here.`} />
          )}
        </Card>
        <Card>
          <CardHeader title="Recent activity" />
          <ActivityFeed items={activity} />
        </Card>
      </div>
    </>
  );
}
