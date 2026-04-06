import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getStore } from "@netlify/blobs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const store = getStore("company-logos");
  try {
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    const contentType =
      (result.metadata.contentType as string) ?? "image/octet-stream";
    return new Response(result.data, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
