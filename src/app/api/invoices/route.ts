import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { SupplyType as PrismaSupplyType } from "@prisma/client";
import { createInvoiceSchema } from "@/lib/validations/invoice";
import { generateInvoiceNumber } from "@/lib/utils";
import { buildGstInvoiceData } from "@/lib/invoice-gst";

// ---------------------------------------------------------------------------
// GET /api/invoices
// ---------------------------------------------------------------------------

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
    ...(status && status !== "ALL"
      ? { status: status as "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" }
      : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({ data: invoices, total, page, limit });
}

// ---------------------------------------------------------------------------
// POST /api/invoices
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract to a const so TypeScript keeps the non-undefined type inside callbacks
  const userId = session.user.id;

  try {
    const body = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      items,
      taxRate: _taxRate, // ignored — GST invoices always use taxRate=0
      discount,
      issueDate,
      dueDate,
      clientId,
      supplyType: clientSupplyType,
      supplyTypeOverridden,
      placeOfSupply,
      documentType: _clientDocType, // ignored — derived server-side
      ...rest
    } = parsed.data;

    const effectiveDiscount = discount ?? 0;

    // Snapshots come from DB — never from the client request body
    const [seller, buyer] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { gstin: true, gstStateCode: true },
      }),
      prisma.client.findFirst({
        where: { id: clientId, userId },
        select: { gstin: true, gstStateCode: true },
      }),
    ]);

    if (!seller) {
      return NextResponse.json({ error: "Seller account not found" }, { status: 500 });
    }
    if (!buyer) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const gst = buildGstInvoiceData(
      seller,
      buyer,
      items.map((i) => ({ ...i, gstRatePct: i.gstRatePct ?? 18 })),
      effectiveDiscount,
      {
        clientSupplyType: clientSupplyType as PrismaSupplyType | undefined,
        supplyTypeOverridden: !!supplyTypeOverridden,
        placeOfSupply,
      }
    );

    if (!gst.ok) {
      return NextResponse.json({ error: gst.error }, { status: 400 });
    }

    const {
      documentType,
      supplyType,
      resolvedPlaceOfSupply,
      lineItems,
      subtotal,
      taxAmount,
      total,
    } = gst.data;

    // Invoice number generation + write in a serializable transaction to
    // prevent duplicate invoice numbers under concurrent requests.
    const invoice = await prisma.$transaction(
      async (tx) => {
        const lastInvoice = await tx.invoice.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { invoiceNumber: true },
        });
        const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoiceNumber);

        return tx.invoice.create({
          data: {
            ...rest,
            invoiceNumber,
            userId,
            clientId,
            issueDate: new Date(issueDate),
            dueDate: new Date(dueDate),
            discount: effectiveDiscount,
            subtotal,
            taxRate: 0, // per-line GST used; invoice-level taxRate is vestigial
            taxAmount,
            total,
            supplyType,
            placeOfSupply: resolvedPlaceOfSupply,
            supplyTypeOverridden: !!supplyTypeOverridden,
            documentType,
            // Snapshots captured from DB at issue time
            sellerGstinSnapshot: seller?.gstin ?? null,
            buyerGstinSnapshot: buyer.gstin ?? null,
            sellerStateSnapshot: seller?.gstStateCode ?? null,
            buyerStateSnapshot: buyer.gstStateCode ?? null,
            items: { create: lineItems },
          },
          include: { client: true, items: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/invoices]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
