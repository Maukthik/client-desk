"use client";

import { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type RevenuePoint = { key: string; label: string; fullLabel: string; value: number };

/** Rounds up to a "clean" axis maximum (1, 2, 2.5, 5 × 10^n). */
function niceMax(value: number) {
  if (value <= 0) return 100_000; // empty chart: a $0–$1K axis (in minor units)
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * exp) return step * exp;
  }
  return 10 * exp;
}

export function RevenueChart({ data, currency }: { data: RevenuePoint[]; currency: string }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const empty = data.every((d) => d.value === 0);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-lg border border-zinc-200 p-0.5" role="group" aria-label="Revenue view">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                view === v ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-800",
              )}
            >
              {v === "chart" ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
              {v === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">Month</th>
                <th className="py-2 text-right font-medium">Collected</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.key} className="border-b border-zinc-100">
                  <td className="py-2 text-zinc-600">{d.fullLabel}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{formatMoney(d.value, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex h-60 gap-3" onPointerLeave={() => setActive(null)}>
          {/* Y axis */}
          <div className="relative w-12 shrink-0 text-right text-[11px] text-zinc-400 tabular-nums" aria-hidden>
            <div className="absolute inset-x-0 top-0 bottom-6">
              {ticks.map((t) => (
                <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
                  {formatMoney(t, currency, { compact: true })}
                </span>
              ))}
            </div>
          </div>
          {/* Plot */}
          <div className="relative flex-1">
            <div className="absolute inset-x-0 top-0 bottom-6">
              {ticks.map((t) => (
                <div
                  key={t}
                  className={cn("absolute inset-x-0 border-t", t === 0 ? "border-zinc-300" : "border-dashed border-zinc-100")}
                  style={{ bottom: `${(t / max) * 100}%` }}
                />
              ))}
            </div>
            <div className="absolute inset-0 flex">
              {data.map((d, i) => {
                const pct = (d.value / max) * 100;
                const isActive = active === i;
                return (
                  <div
                    key={d.key}
                    className="relative flex flex-1 flex-col items-center outline-none"
                    tabIndex={0}
                    role="img"
                    aria-label={`${d.fullLabel}: ${formatMoney(d.value, currency)}`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  >
                    <div className="relative flex w-full flex-1 items-end justify-center">
                      {isActive && <div className="absolute inset-x-0.5 inset-y-0 rounded-md bg-zinc-100/70" />}
                      <div
                        className={cn("relative w-[calc(100%-4px)] max-w-6 rounded-t-[4px]", isActive ? "bg-[#1c5cab]" : "bg-chart-1")}
                        style={{ height: d.value > 0 ? `max(${pct}%, 2px)` : 0 }}
                      />
                      {isActive && (
                        <div
                          className={cn(
                            "pointer-events-none absolute z-10 rounded-lg border border-zinc-200 bg-white px-3 py-2 whitespace-nowrap shadow-lg",
                            i < data.length / 2 ? "left-1/2" : "right-1/2",
                          )}
                          style={{ bottom: `calc(${pct}% + 8px)` }}
                        >
                          <p className="text-sm font-semibold text-zinc-900 tabular-nums">{formatMoney(d.value, currency)}</p>
                          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <span className="h-0.5 w-3 rounded-full bg-chart-1" aria-hidden />
                            Collected · {d.fullLabel}
                          </p>
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "h-6 pt-1.5 text-[11px]",
                        isActive ? "font-medium text-zinc-700" : "text-zinc-400",
                        // Every other month on narrow screens (always keeping the latest) so labels don't collide.
                        (data.length - 1 - i) % 2 === 1 && !isActive && "max-sm:invisible",
                      )}
                    >
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {empty && (
              <div className="absolute inset-x-0 top-1/3 text-center text-sm text-zinc-400">Paid invoices will show up here.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
