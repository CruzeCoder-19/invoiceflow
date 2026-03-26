import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInvoiceSchema } from "@/lib/validations/invoice";
import { generateInvoiceNumber, calculateTotals } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where = {
    userId: session.user.id,
    ...(status && status !== "ALL" ? { status: status as "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: true, items: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({ data: invoices, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { items, taxRate, discount, issueDate, dueDate, ...rest } = parsed.data;

    // Get last invoice number for this user
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    });

    const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoiceNumber);
    const { subtotal, taxAmount, total } = calculateTotals(items, taxRate ?? 0, discount ?? 0);

    const invoice = await prisma.invoice.create({
      data: {
        ...rest,
        invoiceNumber,
        userId: session.user.id,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        taxRate: taxRate ?? 0,
        discount: discount ?? 0,
        subtotal,
        taxAmount,
        total,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
          })),
        },
      },
      include: { client: true, items: true },
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
