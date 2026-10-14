import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, FileCheck2, FolderKanban, LineChart, ShieldCheck, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/dal";

const features = [
  { icon: FolderKanban, title: "Projects clients can follow", body: "Every client gets a branded portal showing project status, due dates and progress — no more status-update emails." },
  { icon: FileCheck2, title: "Deliverables & approvals", body: "Upload files, collect a clear approve or request-changes decision, and keep a record of who signed off and when." },
  { icon: CreditCard, title: "Invoices paid by card", body: "Send professional invoices that clients pay in two clicks with Stripe. Payments reconcile automatically." },
  { icon: LineChart, title: "Revenue at a glance", body: "A dashboard with monthly revenue, outstanding and overdue balances, and the status of every project." },
  { icon: Users, title: "Your whole team", body: "Invite teammates to manage clients and projects together. Invite as many client contacts as you need." },
  { icon: ShieldCheck, title: "Private by design", body: "Clients only ever see their own projects, files and invoices. Files are served through access-checked links." },
];

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className={buttonClasses()}>
                Open dashboard <ArrowRight />
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClasses({ variant: "ghost" })}>
                  Log in
                </Link>
                <Link href="/signup" className={buttonClasses()}>
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(79,70,229,0.12),transparent)]" />
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-xs">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Built for agencies of 1–50 people
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-6xl">
            One professional home for every client relationship.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
            ClientDesk gives your clients a portal to follow projects, approve deliverables and pay invoices — and gives you a clear view of revenue and work in flight.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={buttonClasses({ size: "lg" })}>
              Create your agency <ArrowRight />
            </Link>
            <Link href="/login" className={buttonClasses({ size: "lg", variant: "secondary" })}>
              Log in
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
            {["Free to start", "Unlimited clients", "Stripe payments"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2 shadow-2xl shadow-zinc-900/10">
            <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-4">
              {[
                ["Revenue this month", "$24,850"],
                ["Outstanding", "$9,400"],
                ["Overdue", "$1,200"],
                ["Active projects", "12"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-zinc-100 p-4 text-left">
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
                </div>
              ))}
              <div className="flex h-40 gap-2 rounded-lg border border-zinc-100 p-4 sm:col-span-4" aria-hidden>
                {[38, 52, 45, 61, 58, 72, 66, 80, 74, 88, 82, 96].map((h, i) => (
                  <div key={i} className="flex h-full flex-1 items-end justify-center">
                    <div className="w-full max-w-6 rounded-t-[4px] bg-chart-1" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50/60 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">Everything a client needs from you, in one link.</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Look as organized as you are.</h2>
          <p className="mt-4 text-zinc-600">Set up your agency in a minute and invite your first client today.</p>
          <Link href="/signup" className={buttonClasses({ size: "lg" }, "mt-8")}>
            Get started <ArrowRight />
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-zinc-500 sm:px-6">
          <Logo />
          <span>© {new Date().getFullYear()} ClientDesk</span>
        </div>
      </footer>
    </div>
  );
}
