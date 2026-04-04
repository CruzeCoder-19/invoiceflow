import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "New Invoice — InvoiceDo" };

export default async function NewInvoicePage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const clients = await prisma.client.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  if (clients.length === 0) {
    redirect("/clients/new?from=invoice");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/invoices"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Invoices
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">New Invoice</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
      <InvoiceForm clients={clients} mode="create" />
    </div>
  );
}
