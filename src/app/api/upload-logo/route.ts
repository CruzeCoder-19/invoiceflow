import { NextRequest, NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadLogo, deleteLogo } from "@/lib/netlify-blob";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
const COMPRESSION_THRESHOLD_BYTES = 300 * 1024; // 300 KB

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
      { error: "File too large. Maximum size is 1 MB." },
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
    const originalBuffer = Buffer.from(await file.arrayBuffer());

    let finalBuffer: Buffer;
    let finalContentType: string;
    let finalFilename: string;

    if (originalBuffer.length <= COMPRESSION_THRESHOLD_BYTES) {
      // Small enough — store as-is to preserve original quality
      finalBuffer = originalBuffer;
      finalContentType = file.type;
      finalFilename = file.name;
    } else {
      // Too large — resize and compress with sharp
      try {
        finalBuffer = await sharp(originalBuffer)
          .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
          .png({ quality: 85, compressionLevel: 9 })
          .toBuffer();
        finalContentType = "image/png";
        finalFilename = `${path.parse(file.name).name}.png`;
      } catch (sharpErr) {
        console.error("Sharp processing failed:", sharpErr);
        return NextResponse.json(
          { error: "Failed to process image — please try a different file" },
          { status: 400 }
        );
      }
    }

    const logoUrl = await uploadLogo(finalBuffer, finalFilename, finalContentType, session.user.id);
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
