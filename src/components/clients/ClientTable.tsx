"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Edit, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ClientWithStats } from "@/types";

interface ClientTableProps {
  clients: ClientWithStats[];
}

export function ClientTable({ clients }: ClientTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success("Client deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setDeleting(null);
    }
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray-500 mb-4">No clients yet</p>
        <Link href="/clients/new">
          <Button>Add your first client</Button>
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
              Name
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
              Email
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
              Company
            </th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Invoices
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
              <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                {client.email ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                {client.company ?? "—"}
              </td>
              <td className="px-4 py-3 text-center">
                <Link href={`/invoices?clientId=${client.id}`}>
                  <span className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                    <FileText className="h-3.5 w-3.5" />
                    {client._count?.invoices ?? 0}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <Link href={`/clients/${client.id}/edit`}>
                    <button className="p-2 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(client.id, client.name)}
                    disabled={deleting === client.id}
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
