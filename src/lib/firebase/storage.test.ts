import { describe, expect, it } from "vitest";
import { validateUpload } from "./storage";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0]);
const PDF_HEADER = Buffer.from("%PDF-1.7\n...");

describe("validateUpload", () => {
  it("accepts a correctly-signed PNG under the size limit", () => {
    expect(validateUpload(PNG_HEADER, "image/png", "image")).toBeNull();
  });

  it("accepts a correctly-signed JPEG", () => {
    expect(validateUpload(JPEG_HEADER, "image/jpeg", "image")).toBeNull();
  });

  it("accepts a correctly-signed PDF document", () => {
    expect(validateUpload(PDF_HEADER, "application/pdf", "document")).toBeNull();
  });

  it("rejects an unsupported declared MIME type", () => {
    const result = validateUpload(PNG_HEADER, "application/x-sh", "image");
    expect(result?.code).toBe("UNSUPPORTED_TYPE");
  });

  it("rejects a file whose content does not match its declared image type", () => {
    const fakePng = Buffer.from("<html><body>not a png</body></html>");
    const result = validateUpload(fakePng, "image/png", "image");
    expect(result?.code).toBe("SIGNATURE_MISMATCH");
  });

  it("rejects a file whose content does not match its declared PDF type", () => {
    const fakePdf = Buffer.from("not actually a pdf");
    const result = validateUpload(fakePdf, "application/pdf", "document");
    expect(result?.code).toBe("SIGNATURE_MISMATCH");
  });

  it("rejects an oversized image", () => {
    const oversized = Buffer.concat([PNG_HEADER, Buffer.alloc(6 * 1024 * 1024)]);
    const result = validateUpload(oversized, "image/png", "image");
    expect(result?.code).toBe("TOO_LARGE");
  });
});
