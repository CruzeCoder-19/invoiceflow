import type { Metadata } from "next";
import { ClientForm } from "@/components/clients/ClientForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = { title: "Add Client — InvoiceDo" };

export default function NewClientPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/clients"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Clients
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">New Client</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Add Client</h1>
      <ClientForm mode="create" />
    </div>
  );
}
