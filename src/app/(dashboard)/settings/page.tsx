"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface UserSettings {
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
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState<UserSettings>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setForm(d.data);
      })
      .finally(() => setFetching(false));
  }, []);

  const set = (field: keyof UserSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  if (fetching) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    );
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
            <Input label="Company Name" value={form.company ?? ""} onChange={set("company")} placeholder="Acme Corp" />
            <Input label="Phone" type="tel" value={form.phone ?? ""} onChange={set("phone")} placeholder="+1 (555) 000-0000" />
            <div className="sm:col-span-2">
              <Input label="Logo URL" type="url" value={form.logoUrl ?? ""} onChange={set("logoUrl")} placeholder="https://example.com/logo.png" />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader title="Business Address" />
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Street Address" value={form.address ?? ""} onChange={set("address")} placeholder="123 Main St" />
            </div>
            <Input label="City" value={form.city ?? ""} onChange={set("city")} placeholder="New York" />
            <Input label="State / Province" value={form.state ?? ""} onChange={set("state")} placeholder="NY" />
            <Input label="Zip / Postal Code" value={form.zip ?? ""} onChange={set("zip")} placeholder="10001" />
            <Input label="Country" value={form.country ?? ""} onChange={set("country")} placeholder="United States" />
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
