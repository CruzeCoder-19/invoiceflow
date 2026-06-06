import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { SupplyType as PrismaSupplyType } from "@prisma/client";
import { updateInvoiceSchema } from "@/lib/validations/invoice";
import { buildGstInvoiceData } from "@/lib/invoice-gst";

async function getInvoiceOrFail(id: string, userId: string) {
  return prisma.invoice.findFirst({
    where: { id, userId },
    include: { client: true, items: true },
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

  // Extract to a const so TypeScript keeps the non-undefined type inside callbacks
  const userId = session.user.id;

  const { id } = await params;
  const existing = await getInvoiceOrFail(id, userId);
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

    const {
      items,
      taxRate: _taxRate,
      discount,
      issueDate,
      dueDate,
      clientId,
      supplyType: clientSupplyType,
      supplyTypeOverridden,
      placeOfSupply,
      documentType: _clientDocType,
      ...rest
    } = parsed.data;

    const effectiveDiscount = discount ?? Number(existing.discount);
    const effectiveClientId = clientId ?? existing.clientId;
    const clientChanged = !!clientId && clientId !== existing.clientId;

    // Re-fetch seller + buyer for tax computation (uses current state codes, not snapshots).
    // Snapshots themselves are frozen — only re-written when the buyer changes.
    const [seller, buyer] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { gstin: true, gstStateCode: true },
      }),
      prisma.client.findFirst({
        where: { id: effectiveClientId, userId },
        select: { gstin: true, gstStateCode: true },
      }),
    ]);

    if (!seller) {
      return NextResponse.json({ error: "Seller account not found" }, { status: 500 });
    }
    if (!buyer) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    let updateData: Prisma.InvoiceUpdateInput = { ...rest };
    if (issueDate) updateData.issueDate = new Date(issueDate);
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (clientId) updateData.client = { connect: { id: clientId } };

    // Re-snapshot buyer only when the client is being switched on this invoice.
    // Seller snapshot is always frozen after initial issue.
    if (clientChanged) {
      updateData.buyerGstinSnapshot = buyer.gstin ?? null;
      updateData.buyerStateSnapshot = buyer.gstStateCode ?? null;
    }

    // Recompute GST whenever items are present in the payload
    if (items) {
      const gst = buildGstInvoiceData(
        seller,
        buyer,
        items.map((i) => ({ ...i, gstRatePct: i.gstRatePct ?? 18 })),
        effectiveDiscount,
        {
          clientSupplyType: clientSupplyType as PrismaSupplyType | undefined,
          supplyTypeOverridden: !!supplyTypeOverridden,
          placeOfSupply,
          invoiceId: id,
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

      updateData = {
        ...updateData,
        discount: effectiveDiscount,
        subtotal,
        taxRate: 0,
        taxAmount,
        total,
        supplyType,
        placeOfSupply: resolvedPlaceOfSupply,
        supplyTypeOverridden: !!supplyTypeOverridden,
        documentType,
        items: {
          deleteMany: {},
          create: lineItems,
        },
      };
    }

    const invoice = await prisma.$transaction(
      async (tx) => {
        return tx.invoice.update({
          where: { id },
          data: updateData,
          include: { client: true, items: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({ data: invoice });
  } catch (e) {
    console.error("[PUT /api/invoices/:id]", e);
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
