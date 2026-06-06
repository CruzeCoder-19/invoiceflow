import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClientSchema } from "@/lib/validations/client";
import { INDIAN_STATES } from "@/lib/tax/states";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: clients });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { gstin, gstStateCode, gstStateName, isBusiness: _ignored, ...rest } = parsed.data;

    const resolvedStateName =
      gstStateName?.trim() ||
      (gstStateCode ? (INDIAN_STATES[gstStateCode] ?? null) : null);

    const client = await prisma.client.create({
      data: {
        ...rest,
        email: rest.email || null,
        userId: session.user.id,
        gstin: gstin ?? null,
        gstStateCode: gstStateCode ?? null,
        gstStateName: resolvedStateName ?? null,
        // Derived server-side — true only when a GSTIN is stored
        isBusiness: !!gstin,
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/clients]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
