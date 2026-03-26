import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { InvoiceWithDetails } from "@/types";

interface RecentInvoicesProps {
  invoices: InvoiceWithDetails[];
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card>
      <CardHeader
        title="Recent Invoices"
        action={
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        }
      />
      <CardContent className="p-0">
        {invoices.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">No invoices yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Due</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                    {invoice.client.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(Number(invoice.total))}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
