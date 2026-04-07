"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { MonthlyRevenue } from "@/types";

interface RevenueChartProps {
  data: MonthlyRevenue[];
}

function formatYAxis(value: number) {
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader title="Revenue Overview" description="Last 6 months" />
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) =>
                new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))
              }
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,.1)",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            />
            <Bar dataKey="revenue" name="Total" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
            <Bar dataKey="paid" name="Paid" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
