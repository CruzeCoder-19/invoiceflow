import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { MarkPaidButton } from "@/components/invoices/MarkPaidButton";
import { getStateName } from "@/lib/tax/states";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await auth();
  const userId = session!.user!.id!;
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: { client: true, items: true, user: true },
  });

  if (!invoice) notFound();

  // ── Derived values ─────────────────────────────────────────────────────
  const isLegacy = invoice.supplyType === null;
  const isTaxInvoice = invoice.documentType === "TAX_INVOICE";
  const isIntra = invoice.supplyType === "INTRA_STATE";
  const isInter = invoice.supplyType === "INTER_STATE";

  // Tax totals summed from per-line amounts (not from invoice.taxAmount which is the aggregate)
  const cgstTotal = invoice.items.reduce((s, i) => s + Number(i.cgstAmount), 0);
  const sgstTotal = invoice.items.reduce((s, i) => s + Number(i.sgstAmount), 0);
  const igstTotal = invoice.items.reduce((s, i) => s + Number(i.igstAmount), 0);

  // Snapshots — what was true when this invoice was issued
  const sellerGstin = invoice.sellerGstinSnapshot;
  const sellerState = invoice.sellerStateSnapshot;
  const buyerGstin = invoice.buyerGstinSnapshot;
  const buyerState = invoice.buyerStateSnapshot;

  const placeOfSupplyLabel = invoice.placeOfSupply
    ? `${invoice.placeOfSupply} — ${getStateName(invoice.placeOfSupply) ?? invoice.placeOfSupply}`
    : null;

  // ── Helpers ────────────────────────────────────────────────────────────
  function stateLabel(code: string | null) {
    if (!code) return null;
    return `${code} — ${getStateName(code) ?? code}`;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Invoices
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank">
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          </a>
          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <MarkPaidButton invoiceId={invoice.id} />
          )}
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button size="sm">
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Invoice Card */}
      <Card>
        <CardContent className="p-4 sm:p-8">

          {/* ── Document header ──────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-8">
            {/* Seller block */}
            <div>
              {invoice.user?.logoUrl && (
                <img
                  src={invoice.user.logoUrl}
                  alt={`${invoice.user.company ?? "Company"} logo`}
                  className="max-h-20 w-auto object-contain mb-3"
                />
              )}
              <p className="text-2xl font-bold text-indigo-600">
                {invoice.user?.company ?? "InvoiceDo"}
              </p>
              {invoice.user && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {[invoice.user.address, invoice.user.city, invoice.user.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {/* Seller GST info (snapshot) — shown for non-legacy invoices */}
              {!isLegacy && (
                <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                  <p>
                    <span className="font-medium">GSTIN: </span>
                    {sellerGstin ?? "—"}
                  </p>
                  {invoice.user?.pan && (
                    <p>
                      <span className="font-medium">PAN: </span>
                      {invoice.user.pan}
                    </p>
                  )}
                  {sellerState && (
                    <p>
                      <span className="font-medium">State: </span>
                      {stateLabel(sellerState)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Document title block */}
            <div className="text-right">
              <p className="text-3xl font-extrabold text-gray-900">
                {isLegacy
                  ? "INVOICE"
                  : invoice.documentType === "BILL_OF_SUPPLY"
                    ? "BILL OF SUPPLY"
                    : "TAX INVOICE"}
              </p>
              <p className="text-gray-500 mt-1">{invoice.invoiceNumber}</p>
              <div className="mt-2">
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          {/* ── Bill To + Dates + GST meta ───────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8">
            {/* Buyer */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Bill To
              </p>
              <p className="font-semibold text-gray-900">{invoice.client.name}</p>
              {invoice.client.company && (
                <p className="text-sm text-gray-600">{invoice.client.company}</p>
              )}
              <p className="text-sm text-gray-500">
                {[invoice.client.address, invoice.client.city, invoice.client.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {invoice.client.email && (
                <p className="text-sm text-gray-500">{invoice.client.email}</p>
              )}
              {/* Buyer GST info (snapshot) */}
              {!isLegacy && (
                <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                  <p>
                    <span className="font-medium">GSTIN: </span>
                    {buyerGstin ?? "N/A"}
                  </p>
                  {buyerState && (
                    <p>
                      <span className="font-medium">State: </span>
                      {stateLabel(buyerState)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Dates + GST meta */}
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Details
              </p>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Issue Date: </span>
                  <span className="font-medium">{formatDate(invoice.issueDate)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Due Date: </span>
                  <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                </div>
                {!isLegacy && placeOfSupplyLabel && (
                  <div>
                    <span className="text-gray-500">Place of Supply: </span>
                    <span className="font-medium">{placeOfSupplyLabel}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Legacy banner ────────────────────────────────────────────── */}
          {isLegacy && (
            <div className="mb-4 rounded-lg bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-500">
              Legacy invoice — no GST breakdown available
            </div>
          )}

          {/* ── Line Items ───────────────────────────────────────────────── */}
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-y border-gray-200 bg-gray-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Description</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-600 w-12">Qty</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-600 w-24">Rate</th>
                  {/* GST columns — only for non-legacy TAX_INVOICE */}
                  {!isLegacy && isTaxInvoice && (
                    <>
                      <th className="text-right py-2.5 px-3 font-semibold text-gray-600 w-24">Taxable</th>
                      <th className="text-center py-2.5 px-3 font-semibold text-gray-600 w-14">GST%</th>
                      {isIntra && (
                        <>
                          <th className="text-right py-2.5 px-3 font-semibold text-gray-600 w-20">CGST</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-gray-600 w-20">SGST</th>
                        </>
                      )}
                      {isInter && (
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 w-20">IGST</th>
                      )}
                    </>
                  )}
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-600 w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-3 text-gray-700">{item.description}</td>
                    <td className="py-3 px-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-gray-600">
                      {formatCurrency(Number(item.rate))}
                    </td>
                    {!isLegacy && isTaxInvoice && (
                      <>
                        <td className="py-3 px-3 text-right text-gray-600">
                          {formatCurrency(Number(item.taxableValue))}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-600">
                          {item.gstRatePct}%
                        </td>
                        {isIntra && (
                          <>
                            <td className="py-3 px-3 text-right text-gray-600">
                              {formatCurrency(Number(item.cgstAmount))}
                            </td>
                            <td className="py-3 px-3 text-right text-gray-600">
                              {formatCurrency(Number(item.sgstAmount))}
                            </td>
                          </>
                        )}
                        {isInter && (
                          <td className="py-3 px-3 text-right text-gray-600">
                            {formatCurrency(Number(item.igstAmount))}
                          </td>
                        )}
                      </>
                    )}
                    <td className="py-3 px-3 text-right font-medium text-gray-900">
                      {formatCurrency(Number(item.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Totals ───────────────────────────────────────────────────── */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 sm:ml-auto space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(Number(invoice.discount))}</span>
                </div>
              )}

              {/* Legacy: single tax line */}
              {isLegacy && Number(invoice.taxRate) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({Number(invoice.taxRate)}%)</span>
                  <span>{formatCurrency(Number(invoice.taxAmount))}</span>
                </div>
              )}

              {/* GST: per-component tax lines */}
              {!isLegacy && isTaxInvoice && isIntra && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST</span>
                    <span>{formatCurrency(cgstTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST</span>
                    <span>{formatCurrency(sgstTotal)}</span>
                  </div>
                </>
              )}
              {!isLegacy && isTaxInvoice && isInter && (
                <div className="flex justify-between text-gray-600">
                  <span>IGST</span>
                  <span>{formatCurrency(igstTotal)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(Number(invoice.total))}</span>
              </div>
            </div>
          </div>

          {/* ── Notes & Terms ────────────────────────────────────────────── */}
          {(invoice.notes || invoice.terms) && (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-200 pt-6">
              {invoice.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Terms</p>
                  <p className="text-sm text-gray-600">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
