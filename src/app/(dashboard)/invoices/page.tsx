import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { InvoiceWithDetails } from "@/types";
import type { InvoiceStatus } from "@prisma/client";
import { serialize } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices — InvoiceFlow" };

const STATUSES = ["ALL", "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const;

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session!.user!.id!;
  const { status } = await searchParams;
  const activeStatus = (STATUSES.includes(status as typeof STATUSES[number]) ? status : "ALL") as string;

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      ...(activeStatus !== "ALL" ? { status: activeStatus as InvoiceStatus } : {}),
    },
    include: { client: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/invoices/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit overflow-x-auto">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/invoices" : `/invoices?status=${s}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeStatus === s
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      <Card>
        <InvoiceTable invoices={serialize(invoices) as InvoiceWithDetails[]} />
      </Card>
    </div>
  );
}
