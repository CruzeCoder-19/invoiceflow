import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientTable } from "@/components/clients/ClientTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ClientWithStats } from "@/types";

export const metadata: Metadata = { title: "Clients — InvoiceDo" };

export default async function ClientsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const clients = await prisma.client.findMany({
    where: { userId },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>
      <Card>
        <ClientTable clients={clients as ClientWithStats[]} />
      </Card>
    </div>
  );
}
