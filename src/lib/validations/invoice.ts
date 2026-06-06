import { z } from "zod";
import { gstRatePctSchema, invoiceGstSchema } from "@/lib/validations/gst";

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  rate: z.number().min(0, "Rate must be non-negative"),
  // Server overwrites amount with quantity * rate; accepted here so the form
  // can send it without stripping, but it is never trusted for storage.
  amount: z.number().min(0, "Amount must be non-negative").optional(),
  gstRatePct: gstRatePctSchema.default(18),
});

export const createInvoiceSchema = z
  .object({
    clientId: z.string().min(1, "Client is required"),
    status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).default("DRAFT"),
    issueDate: z.string().or(z.date()),
    dueDate: z.string().or(z.date()),
    // taxRate is kept for schema compat but set to 0 server-side on all new GST invoices.
    // Step 9: remove the "Tax Rate %" input from InvoiceForm so users never send a value here.
    taxRate: z.number().min(0).max(100).default(0),
    discount: z.number().min(0).default(0),
    notes: z.string().optional(),
    terms: z.string().optional(),
    items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  })
  .extend(invoiceGstSchema.shape);

// NOTE: .partial() strips cross-field .superRefine() validators. If invoiceGstSchema
// ever gains cross-field validation, updateInvoiceSchema will silently bypass it.
export const updateInvoiceSchema = createInvoiceSchema.partial();

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
