import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadLogo, deleteLogo } from "@/lib/netlify-blob";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2 MB." },
      { status: 400 }
    );
  }

  // Delete old blob before uploading new one to avoid orphaned files
  try {
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { logoUrl: true },
    });
    if (existing?.logoUrl) {
      const oldKey = new URL(existing.logoUrl, "http://localhost").searchParams.get("key");
      if (oldKey) await deleteLogo(oldKey);
    }
  } catch {
    // Non-blocking — proceed with upload even if cleanup fails
  }

  try {
    const logoUrl = await uploadLogo(file, session.user.id);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { logoUrl },
    });
    return NextResponse.json({ success: true, logoUrl });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { logoUrl: true },
    });
    if (user?.logoUrl) {
      const key = new URL(user.logoUrl, "http://localhost").searchParams.get("key");
      if (key) await deleteLogo(key);
    }
  } catch {
    // Non-blocking — proceed with DB update even if blob delete fails
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { logoUrl: null },
  });

  return NextResponse.json({ success: true });
}
