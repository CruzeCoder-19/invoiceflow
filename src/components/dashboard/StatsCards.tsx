import { formatCurrency } from "@/lib/utils";
import { DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react";
import type { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      sub: `${stats.totalInvoices} invoices`,
      icon: DollarSign,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      title: "Paid",
      value: formatCurrency(stats.paidAmount),
      sub: "Collected",
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Outstanding",
      value: formatCurrency(stats.outstandingAmount),
      sub: "Awaiting payment",
      icon: Clock,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Overdue",
      value: formatCurrency(stats.overdueAmount),
      sub: "Needs attention",
      icon: AlertCircle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
        >
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">{card.title}</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
