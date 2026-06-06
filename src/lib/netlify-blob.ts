import fs from "fs";
import path from "path";

const DEV_BLOB_DIR = path.join(process.cwd(), ".dev-blobs", "company-logos");

type BlobStore = {
  set(key: string, data: ArrayBuffer, opts: { metadata: Record<string, unknown> }): Promise<void>;
  getWithMetadata(
    key: string,
    opts: { type: "arrayBuffer" }
  ): Promise<{ data: ArrayBuffer; metadata: Record<string, unknown> }>;
  delete(key: string): Promise<void>;
};

function getLocalStore(): BlobStore {
  return {
    async set(key, data, { metadata }) {
      const filePath = path.join(DEV_BLOB_DIR, key);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, Buffer.from(data));
      await fs.promises.writeFile(`${filePath}.meta`, JSON.stringify(metadata));
    },
    async getWithMetadata(key) {
      const filePath = path.join(DEV_BLOB_DIR, key);
      try {
        await fs.promises.access(filePath);
      } catch {
        throw new Error("Blob not found");
      }
      const buf = await fs.promises.readFile(filePath);
      const data = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength
      ) as ArrayBuffer;
      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(await fs.promises.readFile(`${filePath}.meta`, "utf-8"));
      } catch {}
      return { data, metadata };
    },
    async delete(key) {
      const filePath = path.join(DEV_BLOB_DIR, key);
      try {
        await fs.promises.unlink(filePath);
      } catch {}
      try {
        await fs.promises.unlink(`${filePath}.meta`);
      } catch {}
    },
  };
}

function getBlobStore(): BlobStore {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getStore } = require("@netlify/blobs") as {
      getStore: (name: string) => BlobStore;
    };
    return getStore("company-logos");
  } catch {
    return getLocalStore();
  }
}

export async function uploadLogo(
  buffer: Buffer,
  filename: string,
  contentType: string,
  userId: string
): Promise<string> {
  const store = getBlobStore();
  const key = `${userId}/${Date.now()}-${filename}`;
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  await store.set(key, arrayBuffer, { metadata: { contentType } });
  return `/api/logo?key=${encodeURIComponent(key)}`;
}

export async function deleteLogo(key: string): Promise<void> {
  const store = getBlobStore();
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

  const store = getBlobStore();
  try {
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    const contentType = (result.metadata.contentType as string) ?? "image/png";
    return { buffer: result.data, contentType };
  } catch {
    return null;
  }
}
