import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateClientSchema } from "@/lib/validations/client";

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

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.email !== undefined ? { email: parsed.data.email || null } : {}),
      },
    });

    return NextResponse.json({ data: client });
  } catch {
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
