import { Sidebar, type NavItem } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { requireViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/status";

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer();

  let items: NavItem[];
  if (viewer.isTeam) {
    items = [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/clients", label: "Clients", icon: "clients" },
      { href: "/projects", label: "Projects", icon: "projects" },
      { href: "/invoices", label: "Invoices", icon: "invoices" },
      { href: "/team", label: "Team", icon: "team" },
    ];
    items.push({ href: "/settings", label: "Settings", icon: "settings" });
  } else {
    const [pendingApprovals, openInvoices] = await Promise.all([
      db.deliverable.count({ where: { status: "PENDING_REVIEW", project: { agencyId: viewer.agency.id, clientId: viewer.clientId! } } }),
      db.invoice.count({ where: { agencyId: viewer.agency.id, clientId: viewer.clientId!, status: "OPEN" } }),
    ]);
    items = [
      { href: "/dashboard", label: "Overview", icon: "dashboard" },
      { href: "/projects", label: "Projects", icon: "projects", badge: pendingApprovals },
      { href: "/invoices", label: "Invoices", icon: "invoices", badge: openInvoices },
      { href: "/settings", label: "Account", icon: "settings" },
    ];
  }

  const roleLabel = viewer.isTeam ? ROLE_LABEL[viewer.role] : (viewer.membership.client?.name ?? "Client");

  return (
    <div className="min-h-screen">
      <Sidebar
        items={items}
        header={
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-xs">
            <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
              {viewer.isTeam ? "Agency" : "Client portal"}
            </p>
            <p className="truncate text-sm font-semibold text-zinc-900">{viewer.agency.name}</p>
          </div>
        }
        footer={
          <UserMenu
            name={viewer.user.name}
            email={viewer.user.email}
            roleLabel={roleLabel}
            activeAgencyId={viewer.agency.id}
            memberships={viewer.memberships.map((m) => ({
              agencyId: m.agencyId,
              agencyName: m.agencyName,
              roleLabel: m.role === "CLIENT" ? `Client · ${m.clientName ?? ""}` : ROLE_LABEL[m.role],
            }))}
          />
        }
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
