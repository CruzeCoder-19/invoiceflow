import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { updateClientSchema } from "@/lib/validations/client";
import { INDIAN_STATES } from "@/lib/tax/states";

async function getClientOrFail(id: string, userId: string) {
  return prisma.client.findFirst({
    where: { id, userId },
    include: { _count: { select: { invoices: true } } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await getClientOrFail(id, session.user.id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ data: client });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getClientOrFail(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { gstin, gstStateCode, gstStateName, isBusiness: _ignored, ...rest } = parsed.data;

    const data: Prisma.ClientUpdateInput = {
      ...rest,
      ...(rest.email !== undefined ? { email: rest.email || null } : {}),
    };

    // Only update GST fields when explicitly present in the payload.
    // undefined means the key was absent — don't wipe existing values.
    if (gstin !== undefined) {
      data.gstin = gstin ?? null;
      // isBusiness always reflects the current gstin state
      data.isBusiness = !!gstin;
    }
    if (gstStateCode !== undefined) {
      data.gstStateCode = gstStateCode ?? null;
      const resolvedStateName =
        gstStateName?.trim() ||
        (gstStateCode ? (INDIAN_STATES[gstStateCode] ?? null) : null);
      data.gstStateName = resolvedStateName ?? null;
    }

    const client = await prisma.client.update({ where: { id }, data });

    return NextResponse.json({ data: client });
  } catch (e) {
    console.error("[PUT /api/clients/:id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getClientOrFail(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (existing._count.invoices > 0) {
    return NextResponse.json(
      { error: "Cannot delete client with existing invoices" },
      { status: 409 }
    );
  }

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ message: "Client deleted" });
}
