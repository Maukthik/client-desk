import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";
import { PROJECT_STATUS, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

const dot: Record<Tone, string> = {
  neutral: "bg-zinc-400",
  brand: "bg-brand-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
};

/** Projects per status as a single-hue bar list; the dot ties each row to its badge color. */
export function StatusBreakdown({ counts }: { counts: { status: ProjectStatus; count: number }[] }) {
  const max = Math.max(1, ...counts.map((c) => c.count));
  return (
    <ul className="space-y-3.5">
      {counts.map(({ status, count }) => {
        const meta = PROJECT_STATUS[status];
        return (
          <li key={status}>
            <Link href={status === "COMPLETED" ? "/projects?filter=completed" : "/projects?filter=active"} className="group block">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-zinc-600 group-hover:text-zinc-900">
                  <span className={cn("size-2 rounded-full", dot[meta.tone])} aria-hidden />
                  {meta.label}
                </span>
                <span className="font-medium text-zinc-900 tabular-nums">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-chart-1 transition-[width] group-hover:bg-[#1c5cab]"
                  style={{ width: count ? `max(${(count / max) * 100}%, 6px)` : 0 }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
