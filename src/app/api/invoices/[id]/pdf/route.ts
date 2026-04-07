import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLogoBuffer } from "@/lib/netlify-blob";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: { client: true, items: true, user: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  let logoDataUrl: string | null = null;
  if (invoice.user?.logoUrl) {
    try {
      const logoResult = await getLogoBuffer(invoice.user.logoUrl);
      if (logoResult) {
        const resizedBuffer = await sharp(Buffer.from(logoResult.buffer))
          .resize({ width: 200, height: 200, fit: "inside", withoutEnlargement: true })
          .png({ quality: 80 })
          .toBuffer();
        logoDataUrl = `data:image/png;base64,${resizedBuffer.toString("base64")}`;
      }
    } catch (err) {
      console.error("Failed to load/process logo for PDF, continuing without it:", err);
    }
  }

  // Dynamically import to avoid bundler issues with ESM package
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const React = await import("react");
  const { InvoicePDFDocument } = await import("@/components/invoices/InvoicePDF");

  const element = React.createElement(
    InvoicePDFDocument as React.ComponentType<{ invoice: typeof invoice; logoDataUrl?: string | null }>,
    { invoice, logoDataUrl }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer: Buffer = await (renderToBuffer as any)(element);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
