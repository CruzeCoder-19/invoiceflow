import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: PageProps) {
  const session = await auth();
  const userId = session!.user!.id!;
  const { id } = await params;

  const [invoice, clients] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, userId },
      include: { items: true },
    }),
    prisma.client.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/invoices/${id}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          {invoice.invoiceNumber}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
      <InvoiceForm clients={clients} invoice={invoice} mode="edit" />
    </div>
  );
}
