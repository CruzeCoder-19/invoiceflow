"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { validateGstin } from "@/lib/tax/gst";
import { STATE_OPTIONS, INDIAN_STATES } from "@/lib/tax/states";
import type { Client } from "@prisma/client";

interface ClientFormProps {
  client?: Client;
  mode: "create" | "edit";
}

export function ClientForm({ client, mode }: ClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: client?.name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    company: client?.company ?? "",
    address: client?.address ?? "",
    city: client?.city ?? "",
    state: client?.state ?? "",
    zip: client?.zip ?? "",
    country: client?.country ?? "",
    // GST fields — state defaults to "21" (Odisha) on new clients, consistent with Settings UX
    isBusiness: client?.isBusiness ?? false,
    gstin: client?.gstin ?? "",
    gstStateCode: client?.gstStateCode ?? "21",
    gstStateName: client?.gstStateName ?? (INDIAN_STATES["21"] ?? ""),
  });

  const [gstinError, setGstinError] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function handleGstStateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    setForm((prev) => ({
      ...prev,
      gstStateCode: code,
      gstStateName: INDIAN_STATES[code] ?? "",
    }));
    // Re-run GSTIN cross-check whenever state changes
    const currentGstin = form.gstin.trim();
    if (currentGstin) {
      const result = validateGstin(currentGstin, code);
      setGstinError(result.ok ? "" : result.error);
    }
  }

  function handleGstinBlur() {
    const gstin = form.gstin.trim();
    if (!gstin) {
      setGstinError("");
      return;
    }
    const result = validateGstin(gstin, form.gstStateCode || undefined);
    setGstinError(result.ok ? "" : result.error);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();

    if (!form.name.trim()) return toast.error("Client name is required");

    if (form.isBusiness && !form.gstin.trim()) {
      return toast.error("GSTIN is required for business clients");
    }
    if (gstinError) {
      return toast.error("Please fix the GSTIN error before saving");
    }

    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/clients/${client?.id}` : "/api/clients";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // Normalise GSTIN to uppercase before sending
          gstin: form.gstin.trim().toUpperCase() || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save client");

      toast.success(mode === "edit" ? "Client updated!" : "Client created!");
      router.push("/clients");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader title="Contact Information" />
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Full Name *"
            value={form.name}
            onChange={set("name")}
            placeholder="Jane Smith"
          />
          <Input
            label="Company"
            value={form.company}
            onChange={set("company")}
            placeholder="Acme Corp"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="jane@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+91 98765 43210"
          />

          {/* isBusiness toggle */}
          <div className="sm:col-span-2 flex items-center gap-3 pt-1">
            <input
              id="isBusiness"
              type="checkbox"
              checked={form.isBusiness}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  isBusiness: e.target.checked,
                  // Clear GSTIN error when unchecking
                  ...(e.target.checked ? {} : { gstin: "" }),
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isBusiness" className="text-sm font-medium text-gray-700 cursor-pointer">
              This client is a business (has GSTIN)
            </label>
          </div>

          {/* GSTIN — shown only for business clients */}
          {form.isBusiness && (
            <div className="sm:col-span-2">
              <Input
                label="GSTIN *"
                value={form.gstin}
                onChange={(e) => {
                  set("gstin")(e);
                  // Clear stale error while user is typing
                  if (gstinError) setGstinError("");
                }}
                onBlur={handleGstinBlur}
                placeholder="21AABCU9603R1ZX"
                error={gstinError || undefined}
                className="uppercase placeholder:normal-case"
              />
              {!gstinError && (
                <p className="mt-1 text-xs text-gray-500">
                  15-character GST Identification Number
                </p>
              )}
            </div>
          )}

          {/* GST state — always visible; needed for place-of-supply even for B2C clients */}
          <div className="sm:col-span-2">
            <Select
              label={form.isBusiness ? "State (for GST) *" : "State (for GST)"}
              value={form.gstStateCode}
              onChange={handleGstStateChange}
              options={STATE_OPTIONS}
              placeholder="Select state"
            />
            {!form.isBusiness && (
              <p className="mt-1 text-xs text-gray-500">
                Required for determining place of supply on invoices
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Address" />
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Street Address"
              value={form.address}
              onChange={set("address")}
              placeholder="123 Main St"
            />
          </div>
          <Input label="City" value={form.city} onChange={set("city")} placeholder="Bhubaneswar" />
          <Input label="State / Province" value={form.state} onChange={set("state")} placeholder="Odisha" />
          <Input label="Zip / Postal Code" value={form.zip} onChange={set("zip")} placeholder="751001" />
          <Input label="Country" value={form.country} onChange={set("country")} placeholder="India" />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {mode === "edit" ? "Update Client" : "Add Client"}
        </Button>
      </div>
    </form>
  );
}
