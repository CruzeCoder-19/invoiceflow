/**
 * Server-side GST invoice computation — shared between POST and PUT invoice routes.
 * No HTTP imports; safe to import from any API route.
 */
import type { DocumentType, SupplyType as PrismaSupplyType } from "@prisma/client";
import { determineSupplyType, computeLineTax } from "@/lib/tax/gst";
import type { SupplyType } from "@/lib/tax/gst";

export interface SellerSnapshot {
  gstin: string | null;
  gstStateCode: string | null;
}

export interface BuyerSnapshot {
  gstin: string | null;
  gstStateCode: string | null;
}

export interface ParsedItem {
  description: string;
  quantity: number;
  rate: number;
  gstRatePct: number;
}

export interface ComputedLineItem {
  description: string;
  quantity: number;
  rate: number;
  /** Line total including tax — keeps Σ amount consistent with grand total. */
  amount: number;
  taxableValue: number;
  gstRatePct: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

export interface GstInvoiceData {
  documentType: DocumentType;
  supplyType: PrismaSupplyType | null;
  resolvedPlaceOfSupply: string | null;
  lineItems: ComputedLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface BuildGstOptions {
  clientSupplyType: PrismaSupplyType | undefined;
  supplyTypeOverridden: boolean;
  placeOfSupply: string | undefined | null;
  /** Included in override log messages when present. */
  invoiceId?: string;
}

/**
 * Resolves document type, supply type, and per-line GST amounts server-side.
 * Returns { ok: false, error } instead of throwing so callers can return a
 * clean HTTP 400 without a try/catch around this call.
 *
 * Rules:
 * - documentType: seller has GSTIN → TAX_INVOICE, else BILL_OF_SUPPLY
 * - supplyType: when supplyTypeOverridden=true, trust clientSupplyType; otherwise
 *   always use determineSupplyType() regardless of what the client sent
 * - Tax amounts: computed fresh here — never trusted from the request body
 * - amount per line: taxableValue + totalTax (so Σ amount = subtotal + totalTax)
 */
export function buildGstInvoiceData(
  seller: SellerSnapshot,
  buyer: BuyerSnapshot,
  items: ParsedItem[],
  discount: number,
  opts: BuildGstOptions
): { ok: true; data: GstInvoiceData } | { ok: false; error: string } {
  const documentType: DocumentType = seller.gstin ? "TAX_INVOICE" : "BILL_OF_SUPPLY";
  const resolvedPlaceOfSupply = opts.placeOfSupply ?? buyer.gstStateCode ?? null;

  let resolvedSupplyType: PrismaSupplyType | null = null;

  if (documentType === "TAX_INVOICE") {
    if (!seller.gstStateCode || !resolvedPlaceOfSupply) {
      return {
        ok: false,
        error: "Both seller and buyer state codes are required for a tax invoice",
      };
    }

    let autoSupplyType: SupplyType;
    try {
      autoSupplyType = determineSupplyType(seller.gstStateCode, resolvedPlaceOfSupply);
    } catch {
      return { ok: false, error: "Could not determine supply type from state codes" };
    }

    if (opts.supplyTypeOverridden && opts.clientSupplyType) {
      resolvedSupplyType = opts.clientSupplyType;
    } else {
      // supplyTypeOverridden=false: auto-detect wins, client value ignored
      resolvedSupplyType = autoSupplyType;
    }
  }

  const lineItems: ComputedLineItem[] = items.map((item) => {
    const taxableValue = item.quantity * item.rate;
    const tax =
      documentType === "TAX_INVOICE" && resolvedSupplyType
        ? computeLineTax(taxableValue, item.gstRatePct, resolvedSupplyType as SupplyType)
        : { cgst: 0, sgst: 0, igst: 0, totalTax: 0 };

    return {
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: taxableValue + tax.totalTax,
      taxableValue,
      gstRatePct: item.gstRatePct,
      cgstAmount: tax.cgst,
      sgstAmount: tax.sgst,
      igstAmount: tax.igst,
    };
  });

  const subtotal = lineItems.reduce((s, i) => s + i.taxableValue, 0);
  const taxAmount = lineItems.reduce((s, i) => s + i.cgstAmount + i.sgstAmount + i.igstAmount, 0);
  const total = Math.max(0, subtotal - discount + taxAmount);

  return {
    ok: true,
    data: { documentType, supplyType: resolvedSupplyType, resolvedPlaceOfSupply, lineItems, subtotal, taxAmount, total },
  };
}
