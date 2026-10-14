"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BriefcaseBusiness, Building2, FolderKanban, LayoutDashboard, Menu, Receipt, Settings, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const icons = {
  dashboard: LayoutDashboard,
  clients: Building2,
  projects: FolderKanban,
  invoices: Receipt,
  team: Users,
  settings: Settings,
  portal: BriefcaseBusiness,
};

export type NavItem = { href: string; label: string; icon: keyof typeof icons; badge?: number };

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active ? "bg-white text-zinc-900 shadow-xs ring-1 ring-zinc-200" : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900",
            )}
          >
            <Icon className={cn("size-4", active ? "text-brand-600" : "text-zinc-400 group-hover:text-zinc-600")} />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-brand-600 px-1.5 py-px text-[11px] font-semibold text-white">{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ items, header, footer }: { items: NavItem[]; header: ReactNode; footer: ReactNode }) {
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>
      <div className="px-3 pb-3">{header}</div>
      <div className="flex-1 overflow-y-auto px-3">
        <NavLinks items={items} onNavigate={() => setOpen(false)} />
      </div>
      <div className="border-t border-zinc-200 p-3">{footer}</div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-200 bg-zinc-100/70 lg:block">{content}</aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100" aria-label="Open navigation">
          <Menu className="size-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-zinc-950/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-zinc-50 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
