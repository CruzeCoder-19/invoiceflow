import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import type { DashboardStats, MonthlyRevenue, InvoiceWithDetails } from "@/types";
import { serialize } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard — InvoiceDo" };

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// pg driver returns NUMERIC columns as strings
type MonthRow = { year: number; month_num: number; revenue: string; paid: string; };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Four parallel queries replace the old unbounded findMany + O(12n) JS loops.
  // createdAt is TIMESTAMP(3) without time zone — double-cast for correct UTC→IST conversion.
  const [statusGroups, clientCount, rawMonthly, recentInvoices] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["status"],
      where: { userId },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.client.count({ where: { userId } }),
    prisma.$queryRaw<MonthRow[]>`
      SELECT
        EXTRACT(YEAR  FROM ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::int AS year,
        EXTRACT(MONTH FROM ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::int AS month_num,
        SUM(total)                                            AS revenue,
        SUM(CASE WHEN status = 'PAID' THEN total ELSE 0 END) AS paid
      FROM "Invoice"
      WHERE "userId" = ${userId}
        AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')
            >= DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata' - INTERVAL '5 months')
      GROUP BY 1, 2
      ORDER BY 1, 2
    `,
    prisma.invoice.findMany({
      where: { userId },
      include: { client: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const byStatus: Record<string, number> = {};
  let totalInvoices = 0;
  for (const g of statusGroups) {
    byStatus[g.status] = Number(g._sum.total ?? 0);
    totalInvoices += g._count.id;
  }

  const stats: DashboardStats = {
    totalRevenue: Object.values(byStatus).reduce((s, v) => s + v, 0),
    paidAmount: byStatus["PAID"] ?? 0,
    outstandingAmount: byStatus["SENT"] ?? 0,
    overdueAmount: byStatus["OVERDUE"] ?? 0,
    totalInvoices,
    totalClients: clientCount,
  };

  const monthMap = new Map<string, { revenue: number; paid: number }>();
  for (const r of rawMonthly) {
    monthMap.set(`${r.year}-${r.month_num}`, { revenue: Number(r.revenue), paid: Number(r.paid) });
  }

  const nowIST   = new Date(Date.now() + IST_OFFSET_MS);
  const curYear  = nowIST.getUTCFullYear();
  const curMonth = nowIST.getUTCMonth();

  const monthlyRevenue: MonthlyRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    let m = curMonth - i;
    let y = curYear;
    if (m < 0) { m += 12; y -= 1; }
    const data = monthMap.get(`${y}-${m + 1}`) ?? { revenue: 0, paid: 0 };
    monthlyRevenue.push({ month: `${MONTH_NAMES[m]} ${String(y).slice(-2)}`, ...data });
  }

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
