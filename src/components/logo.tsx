import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-brand-600" />
      <path d="M9 11.5A2.5 2.5 0 0 1 11.5 9h9a2.5 2.5 0 0 1 2.5 2.5V16h-4.5a2.5 2.5 0 0 0-2.5 2.5V23h-4.5A2.5 2.5 0 0 1 9 20.5z" fill="white" />
      <path d="M18 19.5a1.5 1.5 0 0 1 1.5-1.5H23v2.5a2.5 2.5 0 0 1-2.5 2.5H18z" fill="white" fillOpacity=".55" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("text-[15px] font-semibold tracking-tight", light ? "text-white" : "text-zinc-900")}>ClientDesk</span>
    </span>
  );
}
