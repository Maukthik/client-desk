"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, LogOut } from "lucide-react";
import { logout, switchAgency } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  email: string;
  roleLabel: string;
  activeAgencyId: string;
  memberships: { agencyId: string; agencyName: string; roleLabel: string }[];
};

export function UserMenu({ name, email, roleLabel, activeAgencyId, memberships }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-200/60"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-900">{name}</span>
          <span className="block truncate text-xs text-zinc-500">{roleLabel}</span>
        </span>
        <ChevronsUpDown className="size-4 text-zinc-400" />
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-60 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-zinc-500">{email}</p>
          </div>
          {memberships.length > 1 && (
            <>
              <div className="my-1 border-t border-zinc-100" />
              <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-zinc-400">Switch workspace</p>
              {memberships.map((m) => (
                <form key={m.agencyId} action={switchAgency}>
                  <input type="hidden" name="agencyId" value={m.agencyId} />
                  <button
                    role="menuitem"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-zinc-100",
                      m.agencyId === activeAgencyId && "font-medium",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{m.agencyName}</span>
                      <span className="block truncate text-xs font-normal text-zinc-500">{m.roleLabel}</span>
                    </span>
                    {m.agencyId === activeAgencyId && <Check className="size-4 text-brand-600" />}
                  </button>
                </form>
              ))}
            </>
          )}
          <div className="my-1 border-t border-zinc-100" />
          <form action={logout}>
            <button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
              <LogOut className="size-4 text-zinc-400" />
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
