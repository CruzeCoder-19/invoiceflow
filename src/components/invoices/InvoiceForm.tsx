"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatCurrency, calculateTotals } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { Client, Invoice, InvoiceItem } from "@prisma/client";
import type { InvoiceFormItem } from "@/types";

interface InvoiceFormProps {
  clients: Client[];
  invoice?: Invoice & { items: InvoiceItem[] };
  mode: "create" | "edit";
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

const defaultItem: InvoiceFormItem = { description: "", quantity: 1, rate: 0, amount: 0 };

export function InvoiceForm({ clients, invoice, mode }: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState(invoice?.clientId ?? "");
  const [status, setStatus] = useState(invoice?.status ?? "DRAFT");
  const [issueDate, setIssueDate] = useState(toDateInput(invoice?.issueDate));
  const [dueDate, setDueDate] = useState(
    toDateInput(invoice?.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  );
  const [taxRate, setTaxRate] = useState(Number(invoice?.taxRate ?? 0));
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
    })) ?? [{ ...defaultItem }]
  );

  const totals = calculateTotals(items, taxRate, discount);

  const updateItem = useCallback((index: number, field: keyof InvoiceFormItem, value: string | number) => {
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
  }, []);

  const addItem = () => setItems((prev) => [...prev, { ...defaultItem }]);
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.company ? `${c.name} (${c.company})` : c.name,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId) return toast.error("Please select a client");
    if (items.some((item) => !item.description)) return toast.error("All items need a description");

    setLoading(true);
    try {
      const payload = {
        clientId,
        status,
        issueDate,
        dueDate,
        taxRate,
        discount,
        notes,
        terms,
        items,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Details */}
      <Card>
        <CardHeader title="Invoice Details" />
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <Select
              label="Client *"
              options={clientOptions}
              placeholder="Select a client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          />
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
          <Input
            label="Tax Rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Discount (₹)"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
          />
        </CardContent>
      </Card>

      {/* Line Items */}
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
          {/* Mobile: stacked cards (hidden sm and up) */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {items.map((item, index) => (
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

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                  <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm font-medium text-gray-900">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: existing table (hidden below sm) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-32">Rate</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-32">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
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
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="w-full text-right rounded border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 px-1 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
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
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-2">
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 px-4 py-4">
            <div className="ml-auto w-full max-w-xs space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({taxRate}%)</span>
                  <span>{formatCurrency(totals.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900 border-t border-gray-200 pt-1.5">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Textarea
          label="Notes"
          placeholder="Any additional notes for the client..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
        <Textarea
          label="Terms & Conditions"
          placeholder="Payment terms, late fees, etc."
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {mode === "edit" ? "Update Invoice" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
