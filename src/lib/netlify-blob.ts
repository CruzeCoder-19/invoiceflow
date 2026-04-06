import { getStore } from "@netlify/blobs";

export async function uploadLogo(file: File, userId: string): Promise<string> {
  const store = getStore("company-logos");
  const key = `${userId}/${Date.now()}-${file.name}`;
  const arrayBuffer = await file.arrayBuffer();
  await store.set(key, arrayBuffer, {
    metadata: { contentType: file.type },
  });
  return `/api/logo?key=${encodeURIComponent(key)}`;
}

export async function deleteLogo(key: string): Promise<void> {
  const store = getStore("company-logos");
  await store.delete(key);
}

export async function getLogoBuffer(
  logoUrl: string
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  if (!logoUrl) return null;

  let key: string | null;
  try {
    key = new URL(logoUrl, "http://localhost").searchParams.get("key");
  } catch {
    return null;
  }
  if (!key) return null;

  const store = getStore("company-logos");
  try {
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    const contentType = (result.metadata.contentType as string) ?? "image/png";
    return { buffer: result.data, contentType };
  } catch {
    return null;
  }
}
