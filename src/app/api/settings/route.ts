import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settingsSchema = z.object({
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
});

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

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...parsed.data,
        logoUrl: parsed.data.logoUrl || null,
      },
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
      },
    });

    return NextResponse.json({ data: user });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
      image: true,
    },
  });

  return NextResponse.json({ data: user });
}
