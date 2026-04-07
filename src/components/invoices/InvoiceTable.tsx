"use client";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { Button } from "@/components/ui/Button";
import { Eye, Edit, Trash2, Download } from "lucide-react";
import type { InvoiceWithDetails } from "@/types";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface InvoiceTableProps {
  invoices: InvoiceWithDetails[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, invoiceNumber: string) {
    if (!confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Invoice deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete invoice");
    } finally {
      setDeleting(null);
    }
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray-500 mb-4">No invoices found</p>
        <Link href="/invoices/new">
          <Button>Create your first invoice</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Invoice
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Client
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
              Issue Date
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
              Due Date
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Amount
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="hover:text-indigo-600"
                >
                  {invoice.invoiceNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700">
                <div>{invoice.client.name}</div>
                {invoice.client.company && (
                  <div className="text-xs text-gray-400">{invoice.client.company}</div>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                {formatDate(invoice.issueDate)}
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
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <Link href={`/invoices/${invoice.id}`}>
                    <button className="p-2 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </Link>
                  <Link href={`/invoices/${invoice.id}/edit`}>
                    <button className="p-2 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                  </Link>
                  <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank">
                    <button className="p-2 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                  </a>
                  <button
                    onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                    disabled={deleting === invoice.id}
                    className="p-2 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
