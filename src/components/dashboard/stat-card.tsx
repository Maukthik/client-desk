import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: LucideIcon;
  tone?: "neutral" | "alert";
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{label}</p>
        <Icon className={cn("size-4", tone === "alert" ? "text-red-500" : "text-zinc-400")} />
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular-nums", tone === "alert" && "text-red-600")}>{value}</p>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </Card>
  );
}
