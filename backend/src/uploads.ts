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

// Issue B21: Magic-bytes detection. Klient-leveret file.type kan forfalskes,
// så vi læser de første 16 bytes og verificerer mod kendte image-headers.
// Hvis claimed type ikke matcher faktisk indhold afvises med MIME_MISMATCH.
//
// Reference (file-type-lib og MDN):
//   JPEG:  FF D8 FF
//   PNG:   89 50 4E 47 0D 0A 1A 0A
//   WebP:  bytes 0-3 "RIFF" + bytes 8-11 "WEBP"
//   HEIC/HEIF: bytes 4-7 "ftyp" + bytes 8-11 brand i {heic, heix, hevc, mif1, msf1, heim, heis}
export function detectImageMimeType(buffer: Uint8Array): string | null {
  if (buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: "RIFF" + 4 size bytes + "WEBP"
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  // HEIC/HEIF: bytes 4-7 = "ftyp" og bytes 8-11 = brand
  if (
    buffer[4] === 0x66 && // f
    buffer[5] === 0x74 && // t
    buffer[6] === 0x79 && // y
    buffer[7] === 0x70 // p
  ) {
    const brand = String.fromCharCode(
      buffer[8] ?? 0,
      buffer[9] ?? 0,
      buffer[10] ?? 0,
      buffer[11] ?? 0
    );
    // De brands der dækker iPhone-fotos. mif1/msf1 er fælles HEIF-containere.
    const heicBrands = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];
    if (heicBrands.includes(brand)) {
      // HEIC og HEIF deler container; vi kan ikke distingvere 100% præcist
      // her, men begge er accepterede mime-typer. Returnér "image/heic" som
      // canonisk fordi det er det Safari/iOS bruger som default.
      return "image/heic";
    }
  }

  return null;
}

// Tjekker om to mime-typer er "kompatible" — fx er image/heif og image/heic
// to navne for samme container, og en bruger der uploader fra Mac kan have
// klienten der rapporterer image/heif mens magic-bytes peger på heic. Vi
// accepterer det par.
function mimesCompatible(claimed: string, detected: string): boolean {
  if (claimed === detected) return true;
  const heicLike = new Set(["image/heic", "image/heif"]);
  if (heicLike.has(claimed) && heicLike.has(detected)) return true;
  return false;
}

export type UploadResult = {
  storagePath: string;
  mimeType: string;
  byteSize: number;
};

export type UploadStore = {
  saveImage: (
    bucket: "profile" | "verification" | "organization",
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

      // Issue B21: Magic-bytes-detection. Vi læser hele filen ind én gang
      // (vi skal alligevel skrive den til disken) og sniffer header.
      const buffer = Buffer.from(await file.arrayBuffer());
      const detected = detectImageMimeType(buffer);
      if (!detected) {
        // Kunne ikke detektere et kendt image-format. Afvis hellere end
        // at skrive vilkårlige bytes til disk og servere dem som "image/jpeg".
        throw new Error("MIME_MISMATCH");
      }
      if (!mimesCompatible(file.type, detected)) {
        // Klient siger fx "image/png" men headeren er JPEG → kan være et
        // bevidst forsøg på at omgå MIME-filteret, eller en buggy klient.
        // Vi nægter at gemme filen.
        throw new Error("MIME_MISMATCH");
      }

      // Brug detected MIME som canonisk (klienten kan stadig have løjet om
      // det rigtige format hvis fx HEIF rapporteres som HEIC).
      const canonicalMime = detected;
      const ext = canonicalMime.split("/")[1] ?? "bin";
      const id = randomBytes(16).toString("hex");
      const ownerSlug = safeName(ownerId);
      const relative = join(bucket, ownerSlug, `${Date.now()}-${id}.${ext}`);
      const target = fullPath(relative);

      await ensureDir(resolve(target, ".."));
      await writeFile(target, buffer);

      const stats = await stat(target);
      return {
        storagePath: relative,
        mimeType: canonicalMime,
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
