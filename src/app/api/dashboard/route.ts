import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths, format } from "date-fns";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [invoices, clientCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      select: { status: true, total: true, createdAt: true },
    }),
    prisma.client.count({ where: { userId } }),
  ]);

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const paidAmount = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + Number(inv.total), 0);
  const outstandingAmount = invoices
    .filter((inv) => inv.status === "SENT")
    .reduce((sum, inv) => sum + Number(inv.total), 0);
  const overdueAmount = invoices
    .filter((inv) => inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  // Monthly revenue for last 6 months
  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = startOfMonth(subMonths(new Date(), i - 1));
    const monthInvoices = invoices.filter(
      (inv) => inv.createdAt >= monthStart && inv.createdAt < monthEnd
    );
    monthlyRevenue.push({
      month: format(monthStart, "MMM yyyy"),
      revenue: monthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
      paid: monthInvoices
        .filter((inv) => inv.status === "PAID")
        .reduce((sum, inv) => sum + Number(inv.total), 0),
    });
  }

  return NextResponse.json({
    data: {
      stats: {
        totalRevenue,
        paidAmount,
        outstandingAmount,
        overdueAmount,
        totalInvoices: invoices.length,
        totalClients: clientCount,
      },
      monthlyRevenue,
    },
  });
}
