import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  createImageLoader,
  resizeForButton,
  convertToGrayscale,
} from "../src/utils/imageLoader";

describe("Image loader runtime behavior", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, "temp-image-loader-" + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("loads an existing file as base64 and tracks missing files", async () => {
    const filePath = path.join(tempDir, "sample.bin");
    await fs.writeFile(filePath, Buffer.from("hello"));

    const loader = createImageLoader(tempDir);
    const loaded = await loader.load("sample.bin");
    const missing = await loader.load("missing.bin");

    expect(loaded).toBe(Buffer.from("hello").toString("base64"));
    expect(missing).toBeNull();
    expect(loader.getMissingFiles()).toContain("missing.bin");
  });

  it("grayscales a valid png (or falls back to original when sharp is unavailable)", async () => {
    const tinyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const pngPath = path.join(tempDir, "tiny.png");
    await fs.writeFile(pngPath, Buffer.from(tinyPngBase64, "base64"));

    const loader = createImageLoader(tempDir);
    const value = await loader.toGrayscale("tiny.png");

    expect(value).not.toBeNull();
    expect((value ?? "").length).toBeGreaterThan(0);
  });

  it("calls optional sharp helpers without throwing", async () => {
    const tinyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const pngPath = path.join(tempDir, "tiny.png");
    await fs.writeFile(pngPath, Buffer.from(tinyPngBase64, "base64"));

    const resized = await resizeForButton(pngPath);
    const gray = await convertToGrayscale(pngPath);

    expect(resized === null || Buffer.isBuffer(resized)).toBe(true);
    expect(gray === null || Buffer.isBuffer(gray)).toBe(true);
  });

  it("tracks missing files through toGrayscale", async () => {
    const loader = createImageLoader(tempDir);
    const value = await loader.toGrayscale("missing.png");

    expect(value).toBeNull();
    expect(loader.getMissingFiles()).toContain("missing.png");
  });

  it("returns null for helper functions with missing path", async () => {
    const missing = path.join(tempDir, "does-not-exist.png");
    const resized = await resizeForButton(missing);
    const gray = await convertToGrayscale(missing);

    expect(resized).toBeNull();
    expect(gray).toBeNull();
  });
});
