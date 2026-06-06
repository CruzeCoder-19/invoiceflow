import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { sellerGstDetailsSchema, optionalPanSchema } from "@/lib/validations/gst";
import { INDIAN_STATES } from "@/lib/tax/states";

const settingsSchema = z
  .object({
    name: z.string().min(1).optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    logoUrl: z
      .string()
      .nullish()
      .refine(
        (val) =>
          !val ||
          val === "" ||
          val.startsWith("/api/logo?key=") ||
          /^https?:\/\//.test(val),
        { message: "Invalid logo URL" }
      ),
  })
  .extend(sellerGstDetailsSchema.shape)
  .extend({ pan: optionalPanSchema });

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { gstin, gstStateCode, gstStateName, pan, ...rest } = parsed.data;

    // Derive gstStateName from the code when the client omits it
    const resolvedStateName =
      gstStateName?.trim() ||
      (gstStateCode ? (INDIAN_STATES[gstStateCode] ?? null) : null);

    // Only write GST fields when explicitly present in the payload so a
    // partial save (e.g. updating only company name) does not wipe GSTIN.
    // undefined here means the key was absent from the request body.
    const data: Prisma.UserUpdateInput = { ...rest, logoUrl: rest.logoUrl || null };
    if (gstin !== undefined) data.gstin = gstin ?? null;
    if (pan !== undefined) data.pan = pan ?? null;
    if (gstStateCode !== undefined) {
      data.gstStateCode = gstStateCode ?? null;
      data.gstStateName = resolvedStateName ?? null;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
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

    return NextResponse.json({ data: user });
  } catch (e) {
    console.error("[PUT /api/settings]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

