import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string, fmt = "MMM dd, yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt);
}

export function generateInvoiceNumber(lastNumber?: string | null): string {
  if (!lastNumber) return "INV-0001";
  const match = lastNumber.match(/INV-(\d+)/);
  if (!match) return "INV-0001";
  const next = parseInt(match[1], 10) + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

export interface InvoiceItemInput {
  quantity: number;
  rate: number;
}

export function calculateTotals(
  items: InvoiceItemInput[],
  taxRate: number,
  discount: number
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const discountedSubtotal = subtotal - discount;
  const taxAmount = (discountedSubtotal * taxRate) / 100;
  const total = discountedSubtotal + taxAmount;
  return { subtotal, taxAmount, total: Math.max(0, total) };
}

/**
 * Recursively converts Prisma Decimal objects and Date objects to plain
 * serializable values (number / string) so they can safely cross the
 * Server-Component → Client-Component boundary in Next.js.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serialize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj) as unknown as T;
  if (obj instanceof Date) return obj.toISOString() as unknown as T;
  // Prisma Decimal has a toNumber() method
  if (typeof obj === "object" && "toNumber" in obj && typeof (obj as Record<string, unknown>).toNumber === "function") {
    return (obj as unknown as { toNumber(): number }).toNumber() as unknown as T;
  }
  if (Array.isArray(obj)) return obj.map(serialize) as unknown as T;
  if (typeof obj === "object") {
    const plain: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      plain[key] = serialize(value);
    }
    return plain as T;
  }
  return obj;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SENT: "bg-blue-100 text-blue-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-yellow-100 text-yellow-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}
