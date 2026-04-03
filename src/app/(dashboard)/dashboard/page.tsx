import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { startOfMonth, subMonths, format } from "date-fns";
import type { DashboardStats, MonthlyRevenue, InvoiceWithDetails } from "@/types";
import { serialize } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard — InvoiceFlow" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [invoices, clientCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      include: { client: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where: { userId } }),
  ]);

  const stats: DashboardStats = {
    totalRevenue: invoices.reduce((s: number, i) => s + Number(i.total), 0),
    paidAmount: invoices.filter((i) => i.status === "PAID").reduce((s: number, i) => s + Number(i.total), 0),
    outstandingAmount: invoices.filter((i) => i.status === "SENT").reduce((s: number, i) => s + Number(i.total), 0),
    overdueAmount: invoices.filter((i) => i.status === "OVERDUE").reduce((s: number, i) => s + Number(i.total), 0),
    totalInvoices: invoices.length,
    totalClients: clientCount,
  };

  const monthlyRevenue: MonthlyRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = startOfMonth(subMonths(new Date(), i - 1));
    const monthInvoices = invoices.filter(
      (inv) => inv.createdAt >= monthStart && inv.createdAt < monthEnd
    );
    monthlyRevenue.push({
      month: format(monthStart, "MMM yy"),
      revenue: monthInvoices.reduce((s: number, i) => s + Number(i.total), 0),
      paid: monthInvoices.filter((i) => i.status === "PAID").reduce((s: number, i) => s + Number(i.total), 0),
    });
  }

  const recentInvoices = invoices.slice(0, 5) as InvoiceWithDetails[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening with your invoices.</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart data={monthlyRevenue} />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Quick Actions</p>
            <div className="space-y-2">
              <a href="/invoices/new" className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
                + New Invoice
              </a>
              <a href="/clients/new" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                + Add Client
              </a>
            </div>
          </div>
        </div>
      </div>

      <RecentInvoices invoices={serialize(recentInvoices)} />
    </div>
  );
}
