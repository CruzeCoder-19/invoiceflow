"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { computeLineTax } from "@/lib/tax/gst";
import type { SupplyType } from "@/lib/tax/gst";
import { STATE_OPTIONS, getStateName } from "@/lib/tax/states";
import { Plus, Trash2 } from "lucide-react";
import type { Client, Invoice, InvoiceItem } from "@prisma/client";
import type { InvoiceFormItem } from "@/types";

interface InvoiceFormProps {
  clients: Client[];
  invoice?: Invoice & { items: InvoiceItem[] };
  mode: "create" | "edit";
  /** Seller's GST state code (from User.gstStateCode). Null = unregistered. */
  sellerStateCode: string | null;
  /** Seller's GSTIN. Null = unregistered → BILL_OF_SUPPLY mode. */
  sellerGstin: string | null;
}

const statusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

function toDateInput(date: Date | string | undefined): string {
  if (!date) return new Date().toISOString().split("T")[0];
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

const defaultItem: InvoiceFormItem = {
  description: "",
  quantity: 1,
  rate: 0,
  amount: 0,
  gstRatePct: 18,
};

export function InvoiceForm({
  clients,
  invoice,
  mode,
  sellerStateCode,
  sellerGstin,
}: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ── Core invoice state ───────────────────────────────────────────────────
  const [clientId, setClientId] = useState(invoice?.clientId ?? "");
  const [status, setStatus] = useState<string>(invoice?.status ?? "DRAFT");
  const [issueDate, setIssueDate] = useState(toDateInput(invoice?.issueDate));
  const [dueDate, setDueDate] = useState(
    toDateInput(invoice?.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  );
  const [discount, setDiscount] = useState(Number(invoice?.discount ?? 0));
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [terms, setTerms] = useState(invoice?.terms ?? "Payment due within 30 days.");
  const [items, setItems] = useState<InvoiceFormItem[]>(
    invoice?.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: Number(item.rate),
      amount: Number(item.amount),
      gstRatePct: item.gstRatePct ?? 18,
    })) ?? [{ ...defaultItem }]
  );

  // ── GST state ────────────────────────────────────────────────────────────
  const [supplyTypeOverridden, setSupplyTypeOverridden] = useState(
    invoice?.supplyTypeOverridden ?? false
  );
  const [manualSupplyType, setManualSupplyType] = useState<SupplyType | null>(
    invoice?.supplyTypeOverridden && invoice.supplyType
      ? (invoice.supplyType as SupplyType)
      : null
  );

  // placeOfSupply: prefer saved value → buyer state → seller state → Odisha
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    invoice?.placeOfSupply ??
      clients.find((c) => c.id === (invoice?.clientId ?? ""))?.gstStateCode ??
      sellerStateCode ??
      "21"
  );

  // ── Derived values ───────────────────────────────────────────────────────
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId]
  );
  const buyerStateCode = selectedClient?.gstStateCode ?? null;

  /** Seller has GSTIN → TAX_INVOICE mode; otherwise BILL_OF_SUPPLY (no tax cols). */
  const isTaxInvoice = !!sellerGstin;

  const autoSupplyType = useMemo<SupplyType | null>(() => {
    if (!sellerStateCode || !buyerStateCode) return null;
    return sellerStateCode === buyerStateCode ? "INTRA_STATE" : "INTER_STATE";
  }, [sellerStateCode, buyerStateCode]);

  const effectiveSupplyType: SupplyType | null = supplyTypeOverridden
    ? manualSupplyType
    : autoSupplyType;

  /** Whether to show the "Defaulted to seller state" fallback note. */
  const placeOfSupplyIsDefaulted = !buyerStateCode && !!sellerStateCode;

  const computedLines = useMemo(
    () =>
      items.map((item) => {
        const taxableValue = item.quantity * item.rate;
        if (!isTaxInvoice || !effectiveSupplyType) {
          return { taxableValue, cgst: 0, sgst: 0, igst: 0, lineTotal: taxableValue };
        }
        const tax = computeLineTax(taxableValue, item.gstRatePct, effectiveSupplyType);
        return {
          taxableValue,
          cgst: tax.cgst,
          sgst: tax.sgst,
          igst: tax.igst,
          lineTotal: taxableValue + tax.totalTax,
        };
      }),
    [items, effectiveSupplyType, isTaxInvoice]
  );

  const subtotal = computedLines.reduce((s, l) => s + l.taxableValue, 0);
  const cgstTotal = computedLines.reduce((s, l) => s + l.cgst, 0);
  const sgstTotal = computedLines.reduce((s, l) => s + l.sgst, 0);
  const igstTotal = computedLines.reduce((s, l) => s + l.igst, 0);
  const grandTotal = Math.max(0, subtotal - discount + cgstTotal + sgstTotal + igstTotal);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name })),
    [clients]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newClientId = e.target.value;
    setClientId(newClientId);
    const newClient = clients.find((c) => c.id === newClientId);
    // Update place of supply to the new buyer's state (or fall back to seller)
    setPlaceOfSupply(newClient?.gstStateCode ?? sellerStateCode ?? "21");
  }

  const updateItem = useCallback(
    (index: number, field: keyof InvoiceFormItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "rate") {
            updated.amount = Number(updated.quantity) * Number(updated.rate);
          }
          return updated;
        })
      );
    },
    []
  );

  const addItem = () => setItems((prev) => [...prev, { ...defaultItem }]);
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  // Structural type — avoids React 19's deprecated FormEvent alias
  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();

    if (!clientId) return toast.error("Please select a client");
    if (items.some((item) => !item.description.trim()))
      return toast.error("All items need a description");

    // When seller is registered, a buyer state is required for supply-type detection
    if (isTaxInvoice && !buyerStateCode) {
      return toast.error(
        "Buyer state code is required for a tax invoice — add it to the client's GST details"
      );
    }

    setLoading(true);
    try {
      const payload = {
        clientId,
        status,
        issueDate,
        dueDate,
        taxRate: 0, // per-line GST only; invoice-level taxRate is vestigial
        discount,
        notes,
        terms,
        items: items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount, // server overwrites; included for schema compat
          gstRatePct: item.gstRatePct,
        })),
        supplyType: effectiveSupplyType ?? undefined,
        supplyTypeOverridden,
        placeOfSupply,
      };

      const url = mode === "edit" ? `/api/invoices/${invoice?.id}` : "/api/invoices";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save invoice");

      toast.success(mode === "edit" ? "Invoice updated!" : "Invoice created!");
      router.push(`/invoices/${data.data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ── Supply type badge helpers ─────────────────────────────────────────────
  const supplyBadgeLabel =
    effectiveSupplyType === "INTRA_STATE"
      ? "Intra-state (CGST + SGST)"
      : effectiveSupplyType === "INTER_STATE"
        ? "Inter-state (IGST)"
        : "Unknown — state codes missing";

  const supplyBadgeClass =
    effectiveSupplyType === "INTRA_STATE"
      ? "bg-green-100 text-green-800"
      : effectiveSupplyType === "INTER_STATE"
        ? "bg-blue-100 text-blue-800"
        : "bg-gray-100 text-gray-500";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Invoice Details ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Invoice Details" />
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* Client */}
          <div className="min-w-0">
            <Select
              label="Client *"
              options={clientOptions}
              placeholder="Select a client"
              value={clientId}
              onChange={handleClientChange}
            />
          </div>

          {/* Status */}
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />

          {/* Dates */}
          <Input
            label="Issue Date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          {/* Discount */}
          <Input
            label="Discount (₹)"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
          />

          {/* GST section — only when seller is registered */}
          {isTaxInvoice && (
            <>
              {/* State info badges */}
              <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm">
                  <span className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Seller State
                  </span>
                  <span className="font-medium text-gray-800">
                    {sellerStateCode
                      ? `${sellerStateCode} — ${getStateName(sellerStateCode) ?? "Unknown"}`
                      : <span className="text-amber-600 font-normal">Not set — add in Settings</span>}
                  </span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm">
                  <span className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Buyer State
                  </span>
                  <span className="font-medium text-gray-800">
                    {buyerStateCode
                      ? `${buyerStateCode} — ${getStateName(buyerStateCode) ?? "Unknown"}`
                      : <span className="text-amber-600 font-normal">Not set — add in Client GST details</span>}
                  </span>
                </div>
              </div>

              {/* Supply type badge + override toggle */}
              <div className="sm:col-span-2 lg:col-span-3 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${supplyBadgeClass}`}
                  >
                    {supplyBadgeLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !supplyTypeOverridden;
                      setSupplyTypeOverridden(next);
                      if (next && !manualSupplyType) {
                        setManualSupplyType(autoSupplyType ?? "INTRA_STATE");
                      }
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                  >
                    {supplyTypeOverridden ? "Use auto-detect" : "Override"}
                  </button>
                </div>

                {supplyTypeOverridden && (
                  <div className="space-y-1.5">
                    <div className="flex gap-4">
                      {(["INTRA_STATE", "INTER_STATE"] as const).map((type) => (
                        <label key={type} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="manualSupplyType"
                            value={type}
                            checked={manualSupplyType === type}
                            onChange={() => setManualSupplyType(type)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          {type === "INTRA_STATE" ? "Intra-state (CGST + SGST)" : "Inter-state (IGST)"}
                        </label>
                      ))}
                    </div>
                    {autoSupplyType && manualSupplyType && manualSupplyType !== autoSupplyType && (
                      <p className="text-xs text-amber-600">
                        ⚠ Manually overridden — state codes suggest{" "}
                        {autoSupplyType === "INTRA_STATE" ? "Intra-state" : "Inter-state"}
                      </p>
                    )}
                    {!autoSupplyType && supplyTypeOverridden && (
                      <p className="text-xs text-amber-600">
                        ⚠ State codes are missing — manual selection cannot be cross-checked.
                        Verify before saving.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Place of Supply */}
              <div className="sm:col-span-2 lg:col-span-3 sm:max-w-xs">
                <Select
                  label="Place of Supply"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  options={STATE_OPTIONS}
                />
                {placeOfSupplyIsDefaulted && (
                  <p className="mt-1 text-xs text-amber-600">
                    Defaulted to seller state — please verify (buyer has no GST state set)
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Line Items ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Line Items"
          action={
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          }
        />
        <CardContent className="p-0">

          {/* ── Mobile: stacked cards ─────────────────────────── */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {items.map((item, index) => {
              const cl = computedLines[index];
              return (
                <div key={index} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="p-2 rounded text-gray-400 hover:text-red-500 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Item description"
                      className="w-full rounded border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 px-3 py-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="w-full rounded border border-gray-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(index, "rate", parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="w-full rounded border border-gray-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 px-3 py-2"
                      />
                    </div>
                  </div>

                  {/* GST fields — mobile */}
                  {isTaxInvoice && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">GST Rate</label>
                          <select
                            value={item.gstRatePct}
                            onChange={(e) => updateItem(index, "gstRatePct", parseInt(e.target.value))}
                            className="w-full rounded border border-gray-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 px-3 py-2"
                          >
                            {[0, 5, 12, 18, 28].map((r) => (
                              <option key={r} value={r}>{r}%</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Taxable Value</label>
                          <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm font-medium text-gray-700">
                            {formatCurrency(cl.taxableValue)}
                          </div>
                        </div>
                      </div>
                      {effectiveSupplyType === "INTRA_STATE" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">CGST</label>
                            <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700">
                              {formatCurrency(cl.cgst)}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">SGST</label>
                            <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700">
                              {formatCurrency(cl.sgst)}
                            </div>
                          </div>
                        </div>
                      )}
                      {effectiveSupplyType === "INTER_STATE" && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">IGST</label>
                          <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700">
                            {formatCurrency(cl.igst)}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                    <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm font-medium text-gray-900">
                      {formatCurrency(cl.lineTotal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Desktop: table ──────────────────────────────────── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 w-16">Qty</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 w-24">Rate</th>
                  {isTaxInvoice && (
                    <>
                      <th className="text-right px-3 py-3 font-medium text-gray-600 w-24">Taxable</th>
                      <th className="text-center px-3 py-3 font-medium text-gray-600 w-20">GST %</th>
                      {effectiveSupplyType !== "INTER_STATE" && (
                        <>
                          <th className="text-right px-3 py-3 font-medium text-gray-600 w-20">CGST</th>
                          <th className="text-right px-3 py-3 font-medium text-gray-600 w-20">SGST</th>
                        </>
                      )}
                      {effectiveSupplyType !== "INTRA_STATE" && (
                        <th className="text-right px-3 py-3 font-medium text-gray-600 w-20">IGST</th>
                      )}
                    </>
                  )}
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-28">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => {
                  const cl = computedLines[index];
                  return (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder="Item description"
                          className="w-full rounded border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 px-1 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                          onFocus={(e) => e.target.select()}
                          className="w-full text-right rounded border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 px-1 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(index, "rate", parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-full text-right rounded border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 px-1 py-1"
                        />
                      </td>
                      {isTaxInvoice && (
                        <>
                          <td className="px-3 py-2 text-right text-sm text-gray-600">
                            {formatCurrency(cl.taxableValue)}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.gstRatePct}
                              onChange={(e) =>
                                updateItem(index, "gstRatePct", parseInt(e.target.value))
                              }
                              className="w-full text-center rounded border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 px-1 py-1"
                            >
                              {[0, 5, 12, 18, 28].map((r) => (
                                <option key={r} value={r}>{r}%</option>
                              ))}
                            </select>
                          </td>
                          {effectiveSupplyType !== "INTER_STATE" && (
                            <>
                              <td className="px-3 py-2 text-right text-sm text-gray-600">
                                {formatCurrency(cl.cgst)}
                              </td>
                              <td className="px-3 py-2 text-right text-sm text-gray-600">
                                {formatCurrency(cl.sgst)}
                              </td>
                            </>
                          )}
                          {effectiveSupplyType !== "INTRA_STATE" && (
                            <td className="px-3 py-2 text-right text-sm text-gray-600">
                              {formatCurrency(cl.igst)}
                            </td>
                          )}
                        </>
                      )}
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {formatCurrency(cl.lineTotal)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="p-1 rounded text-gray-400 hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Totals ──────────────────────────────────────────── */}
          <div className="border-t border-gray-200 px-4 py-4">
            <div className="ml-auto w-full max-w-xs space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {isTaxInvoice && effectiveSupplyType === "INTRA_STATE" && (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>CGST</span>
                    <span>{formatCurrency(cgstTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>SGST</span>
                    <span>{formatCurrency(sgstTotal)}</span>
                  </div>
                </>
              )}
              {isTaxInvoice && effectiveSupplyType === "INTER_STATE" && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IGST</span>
                  <span>{formatCurrency(igstTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900 border-t border-gray-200 pt-1.5">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Notes & Terms ───────────────────────────────────────────────── */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes for the client..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Terms &amp; Conditions</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Payment terms, late fees, etc."
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {mode === "edit" ? "Update Invoice" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
