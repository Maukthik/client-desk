import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-500">It may have been moved or deleted, or you may not have access to it.</p>
      <Link href="/dashboard" className={buttonClasses({ variant: "secondary" }, "mt-6")}>
        Back to dashboard
      </Link>
    </div>
  );
}
