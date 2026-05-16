import { describe, expect, test } from "bun:test";
import { detectImageMimeType } from "../src/uploads";

// Issue B21: Magic-bytes detection. Verifier at de fem accepterede formater
// gen-kendes korrekt og at vilkårlige bytes afvises.
describe("detectImageMimeType", () => {
  test("detects JPEG (FF D8 FF)", () => {
    const jpeg = new Uint8Array(20);
    jpeg[0] = 0xff;
    jpeg[1] = 0xd8;
    jpeg[2] = 0xff;
    expect(detectImageMimeType(jpeg)).toBe("image/jpeg");
  });

  test("detects PNG (89 50 4E 47 0D 0A 1A 0A)", () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0
    ]);
    expect(detectImageMimeType(png)).toBe("image/png");
  });

  test("detects WebP (RIFF...WEBP)", () => {
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0, 0, 0, 0, // size
      0x57, 0x45, 0x42, 0x50 // WEBP
    ]);
    expect(detectImageMimeType(webp)).toBe("image/webp");
  });

  test("detects HEIC (ftyp + heic brand)", () => {
    const heic = new Uint8Array([
      0, 0, 0, 0x18,
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x68, 0x65, 0x69, 0x63 // heic
    ]);
    expect(detectImageMimeType(heic)).toBe("image/heic");
  });

  test("detects HEIF (ftyp + mif1 brand)", () => {
    const heif = new Uint8Array([
      0, 0, 0, 0x18,
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x6d, 0x69, 0x66, 0x31 // mif1
    ]);
    expect(detectImageMimeType(heif)).toBe("image/heic");
  });

  test("returns null for unknown bytes", () => {
    const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    expect(detectImageMimeType(garbage)).toBeNull();
  });

  test("returns null for buffer too small", () => {
    const tiny = new Uint8Array([0xff, 0xd8]);
    expect(detectImageMimeType(tiny)).toBeNull();
  });

  test("rejects PDF disguised as image", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0, 0, 0, 0, 0]);
    expect(detectImageMimeType(pdf)).toBeNull();
  });
});
