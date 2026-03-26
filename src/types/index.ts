import type { Invoice, InvoiceItem, Client, User, InvoiceStatus } from "@prisma/client";

export type { InvoiceStatus };

export interface InvoiceWithDetails extends Invoice {
  client: Client;
  items: InvoiceItem[];
  user?: User;
}

export interface ClientWithStats extends Client {
  _count?: {
    invoices: number;
  };
  invoices?: Invoice[];
}

export interface DashboardStats {
  totalRevenue: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  totalInvoices: number;
  totalClients: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  paid: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface InvoiceFormItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceFormData {
  clientId: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  taxRate: number;
  discount: number;
  notes: string;
  terms: string;
  items: InvoiceFormItem[];
}
