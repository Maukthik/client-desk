import Link from "next/link";
import { Avatar } from "@/components/ui/misc";
import { formatRelative } from "@/lib/utils";

type Item = { id: string; message: string; href: string | null; createdAt: Date; actor: { name: string } | null };

export function ActivityFeed({ items }: { items: Item[] }) {
  if (items.length === 0) return <p className="px-5 py-6 text-sm text-zinc-500">No activity yet.</p>;
  return (
    <ul className="space-y-4 px-5 py-4">
      {items.map((item) => {
        const body = (
          <>
            <p className="text-sm text-zinc-700">{item.message}</p>
            <p className="text-xs text-zinc-400">{formatRelative(item.createdAt)}</p>
          </>
        );
        return (
          <li key={item.id} className="flex gap-3">
            <Avatar name={item.actor?.name ?? "ClientDesk"} className="size-7 text-[10px]" />
            <div className="min-w-0 flex-1">
              {item.href ? (
                <Link href={item.href} className="block hover:[&>p:first-child]:text-zinc-900">
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
