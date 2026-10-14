import Link from "next/link";
import type { InvoiceStatus } from "@prisma/client";
import { Table, Td, Th } from "@/components/ui/misc";
import { InvoiceBadge } from "@/components/status-badges";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export type InvoiceRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  dueDate: Date;
  issueDate: Date;
  client: { name: string };
  project: { name: string } | null;
};

export function InvoiceTable({ invoices, showClient = true }: { invoices: InvoiceRow[]; showClient?: boolean }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Invoice</Th>
          {showClient && <Th>Client</Th>}
          <Th>Status</Th>
          <Th className="hidden md:table-cell">Issued</Th>
          <Th>Due</Th>
          <Th className="text-right">Amount</Th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.id} className="group hover:bg-zinc-50/70">
            <Td>
              <Link href={`/invoices/${invoice.id}`} className="font-medium text-zinc-900 group-hover:text-brand-700">
                {invoice.number}
              </Link>
              {invoice.project && <p className="truncate text-xs text-zinc-500">{invoice.project.name}</p>}
            </Td>
            {showClient && <Td className="text-zinc-600">{invoice.client.name}</Td>}
            <Td>
              <InvoiceBadge status={invoice.status} dueDate={invoice.dueDate} />
            </Td>
            <Td className="hidden text-zinc-600 md:table-cell">{formatDate(invoice.issueDate)}</Td>
            <Td className="text-zinc-600">{formatDate(invoice.dueDate)}</Td>
            <Td className="text-right font-medium tabular-nums">{formatMoney(invoice.total, invoice.currency)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
