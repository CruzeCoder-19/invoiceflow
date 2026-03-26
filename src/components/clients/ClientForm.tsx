"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
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
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Client name is required");

    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/clients/${client?.id}` : "/api/clients";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
            placeholder="+1 (555) 000-0000"
          />
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
          <Input label="City" value={form.city} onChange={set("city")} placeholder="New York" />
          <Input label="State / Province" value={form.state} onChange={set("state")} placeholder="NY" />
          <Input label="Zip / Postal Code" value={form.zip} onChange={set("zip")} placeholder="10001" />
          <Input label="Country" value={form.country} onChange={set("country")} placeholder="United States" />
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
