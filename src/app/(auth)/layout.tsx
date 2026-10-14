import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";

const points = [
  "Share deliverables and collect approvals in one place",
  "Send invoices clients can pay by card in seconds",
  "See revenue and every project's status at a glance",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="flex flex-col bg-white px-6 py-8 sm:px-12">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-xs text-zinc-400">© {new Date().getFullYear()} ClientDesk</p>
      </div>
      <div className="relative hidden overflow-hidden bg-zinc-950 lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.45),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            The calm, professional way to work with clients.
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-zinc-300">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-500" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
