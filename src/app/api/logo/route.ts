import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getLogoBuffer } from "@/lib/netlify-blob";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const logoUrl = `/api/logo?key=${encodeURIComponent(key)}`;
  const result = await getLogoBuffer(logoUrl);
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.buffer, {
    headers: { "Content-Type": result.contentType },
  });
}
