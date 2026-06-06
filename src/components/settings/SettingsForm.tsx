"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { validateGstin } from "@/lib/tax/gst";
import { STATE_OPTIONS, INDIAN_STATES } from "@/lib/tax/states";

export interface UserSettings {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  logoUrl?: string;
  gstin?: string | null;
  gstStateCode?: string | null;
  gstStateName?: string | null;
  pan?: string | null;
}

interface Props {
  initialSettings: UserSettings;
}

export function SettingsForm({ initialSettings }: Props) {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<UserSettings>(initialSettings);
  const [gstinError, setGstinError] = useState("");
  const [panError, setPanError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set =
    (field: keyof UserSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function handleStateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    setForm((prev) => ({
      ...prev,
      gstStateCode: code,
      gstStateName: INDIAN_STATES[code] ?? "",
    }));
    const currentGstin = form.gstin?.trim();
    if (currentGstin) {
      const result = validateGstin(currentGstin, code);
      setGstinError(result.ok ? "" : result.error);
    }
  }

  function handlePanBlur() {
    const pan = form.pan?.trim().toUpperCase();
    if (!pan) { setPanError(""); return; }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      setPanError("Invalid PAN format (e.g. ABCDE1234F)");
    } else {
      setPanError("");
    }
  }

  function handleGstinBlur() {
    const gstin = form.gstin?.trim();
    if (!gstin) { setGstinError(""); return; }
    const result = validateGstin(gstin, form.gstStateCode ?? undefined);
    setGstinError(result.ok ? "" : result.error);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPEG, PNG, or WebP files are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error("File size must be under 1 MB");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setForm((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      toast.success("Logo uploaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemoveLogo() {
    setUploading(true);
    try {
      const res = await fetch("/api/upload-logo", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove logo");
      setForm((prev) => ({ ...prev, logoUrl: undefined }));
      toast.success("Logo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove logo");
    } finally {
      setUploading(false);
    }
  }

  // Structural type — avoids React 19's deprecated FormEvent alias
  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();

    if (gstinError) { toast.error("Please fix the GSTIN error before saving"); return; }
    if (panError) { toast.error("Please fix the PAN error before saving"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      await update({ name: form.name });
      toast.success("Settings saved!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          This info appears on your invoices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account */}
        <Card>
          <CardHeader title="Account" description="Your personal information" />
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full Name" value={form.name ?? ""} onChange={set("name")} />
            <Input label="Email" type="email" value={form.email ?? ""} disabled />
          </CardContent>
        </Card>

        {/* Business */}
        <Card>
          <CardHeader title="Business" description="Displayed on PDF invoices" />
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Company Name"
              value={form.company ?? ""}
              onChange={set("company")}
              placeholder="Acme Corp"
            />
            <Input
              label="Phone"
              type="tel"
              value={form.phone ?? ""}
              onChange={set("phone")}
              placeholder="+91 98765 43210"
            />
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Company Logo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              {form.logoUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={form.logoUrl}
                    alt="Company logo"
                    className="max-h-[120px] rounded-md border border-gray-200 object-contain"
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={uploading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleRemoveLogo}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose file
                  </Button>
                  <p className="text-sm text-gray-500">JPEG, PNG, or WebP · max 1 MB</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Address */}
        <Card>
          <CardHeader title="Business Address" />
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Street Address"
                value={form.address ?? ""}
                onChange={set("address")}
                placeholder="123 Main St"
              />
            </div>
            <Input label="City" value={form.city ?? ""} onChange={set("city")} placeholder="Bhubaneswar" />
            <Input label="State / Province" value={form.state ?? ""} onChange={set("state")} placeholder="Odisha" />
            <Input label="Zip / Postal Code" value={form.zip ?? ""} onChange={set("zip")} placeholder="751001" />
            <Input label="Country" value={form.country ?? ""} onChange={set("country")} placeholder="India" />
          </CardContent>
        </Card>

        {/* GST Details */}
        <Card>
          <CardHeader
            title="GST Details"
            description="Required for tax invoices (CGST + SGST / IGST). Leave blank if unregistered — invoices will use Bill of Supply format."
          />
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="GSTIN"
                value={form.gstin ?? ""}
                onChange={set("gstin")}
                onBlur={handleGstinBlur}
                placeholder="21AABCU9603R1ZX"
                error={gstinError || undefined}
                className="uppercase placeholder:normal-case"
              />
              {!gstinError && (
                <p className="mt-1 text-xs text-gray-500">
                  15-character GST Identification Number · leave blank if unregistered
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Input
                label="PAN"
                value={form.pan ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))
                }
                onBlur={handlePanBlur}
                placeholder="ABCDE1234F"
                error={panError || undefined}
                className="uppercase placeholder:normal-case"
              />
              {!panError && (
                <p className="mt-1 text-xs text-gray-500">
                  10-character Permanent Account Number · leave blank if not applicable
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Select
                label="State (for GST)"
                value={form.gstStateCode ?? "21"}
                onChange={handleStateChange}
                options={STATE_OPTIONS}
                placeholder="Select state"
              />
              <p className="mt-1 text-xs text-gray-500">
                The state where your business is registered for GST
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
