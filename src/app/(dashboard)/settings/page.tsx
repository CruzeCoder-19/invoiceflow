import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INDIAN_STATES } from "@/lib/tax/states";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Settings — InvoiceDo" };

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      company: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      country: true,
      logoUrl: true,
      gstin: true,
      gstStateCode: true,
      gstStateName: true,
      pan: true,
    },
  });

  return (
    <SettingsForm
      initialSettings={{
        ...user,
        // null → undefined so logoUrl stays typed as string | undefined
        logoUrl: user?.logoUrl ?? undefined,
        // Default to Odisha (code "21") when user hasn't set a GST state yet
        gstStateCode: user?.gstStateCode ?? "21",
        gstStateName: user?.gstStateName ?? INDIAN_STATES["21"],
      }}
    />
  );
}
