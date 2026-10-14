export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-2 h-7 w-48 rounded-md bg-zinc-200/70" />
      <div className="mb-8 h-4 w-72 rounded-md bg-zinc-200/50" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-zinc-200 bg-white" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-xl border border-zinc-200 bg-white" />
    </div>
  );
}
