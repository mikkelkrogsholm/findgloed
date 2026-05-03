import { mkdir, writeFile, unlink, stat, readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { join, resolve } from "node:path";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

const MAX_BYTES = 8 * 1024 * 1024; // 8MB pr. billede

export type UploadResult = {
  storagePath: string;
  mimeType: string;
  byteSize: number;
};

export type UploadStore = {
  saveImage: (
    bucket: "profile" | "verification",
    ownerId: string,
    file: File
  ) => Promise<UploadResult>;
  delete: (storagePath: string) => Promise<void>;
  read: (storagePath: string) => Promise<{ data: Buffer; mimeType: string }>;
  fullPath: (storagePath: string) => string;
};

function safeName(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function createLocalUploadStore(rootDir: string): UploadStore {
  const root = resolve(rootDir);

  async function ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  function fullPath(storagePath: string): string {
    const target = resolve(root, storagePath);
    if (!target.startsWith(root)) {
      throw new Error("Invalid storage path");
    }
    return target;
  }

  return {
    async saveImage(bucket, ownerId, file) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        throw new Error("UNSUPPORTED_MIME_TYPE");
      }
      if (file.size > MAX_BYTES) {
        throw new Error("FILE_TOO_LARGE");
      }

      const ext = file.type.split("/")[1] ?? "bin";
      const id = randomBytes(16).toString("hex");
      const ownerSlug = safeName(ownerId);
      const relative = join(bucket, ownerSlug, `${Date.now()}-${id}.${ext}`);
      const target = fullPath(relative);

      await ensureDir(resolve(target, ".."));
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(target, buffer);

      const stats = await stat(target);
      return {
        storagePath: relative,
        mimeType: file.type,
        byteSize: stats.size
      };
    },

    async delete(storagePath) {
      try {
        await unlink(fullPath(storagePath));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    },

    async read(storagePath) {
      const data = await readFile(fullPath(storagePath));
      const ext = storagePath.split(".").pop() ?? "";
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        heic: "image/heic",
        heif: "image/heif"
      };
      return { data, mimeType: mimeMap[ext.toLowerCase()] ?? "application/octet-stream" };
    },

    fullPath
  };
}
