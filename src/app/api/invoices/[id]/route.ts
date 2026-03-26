import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateInvoiceSchema } from "@/lib/validations/invoice";
import { calculateTotals } from "@/lib/utils";

async function getInvoiceOrFail(id: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: { client: true, items: true },
  });
  return invoice;
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
  const invoice = await getInvoiceOrFail(id, session.user.id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ data: invoice });
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
  const existing = await getInvoiceOrFail(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updateInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { items, taxRate, discount, issueDate, dueDate, ...rest } = parsed.data;

    let updateData: Parameters<typeof prisma.invoice.update>[0]["data"] = { ...rest };

    if (issueDate) updateData.issueDate = new Date(issueDate);
    if (dueDate) updateData.dueDate = new Date(dueDate);

    if (items) {
      const effectiveTaxRate = taxRate ?? Number(existing.taxRate);
      const effectiveDiscount = discount ?? Number(existing.discount);
      const { subtotal, taxAmount, total } = calculateTotals(
        items,
        effectiveTaxRate,
        effectiveDiscount
      );
      updateData = {
        ...updateData,
        taxRate: effectiveTaxRate,
        discount: effectiveDiscount,
        subtotal,
        taxAmount,
        total,
      };
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...updateData,
        ...(items
          ? {
              items: {
                deleteMany: {},
                create: items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  rate: item.rate,
                  amount: item.quantity * item.rate,
                })),
              },
            }
          : {}),
      },
      include: { client: true, items: true },
    });

    return NextResponse.json({ data: invoice });
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
  const existing = await getInvoiceOrFail(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ message: "Invoice deleted" });
}
