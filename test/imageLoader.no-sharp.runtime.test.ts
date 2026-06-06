import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("Image loader without sharp", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, "temp-image-loader-no-sharp-" + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, "sample.bin"), Buffer.from("hello"));
  });

  afterEach(async () => {
    vi.doUnmock("sharp");
    vi.resetModules();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("falls back when sharp cannot be loaded", async () => {
    vi.resetModules();
    vi.doMock("sharp", () => {
      throw new Error("sharp unavailable");
    });

    const imageUtils = await import("../src/utils/imageLoader");
    const loader = imageUtils.createImageLoader(tempDir);

    const gray = await loader.toGrayscale("sample.bin");
    const resized = await imageUtils.resizeForButton(
      path.join(tempDir, "sample.bin"),
    );
    const converted = await imageUtils.convertToGrayscale(
      path.join(tempDir, "sample.bin"),
    );

    expect(gray).toBe(Buffer.from("hello").toString("base64"));
    expect(resized).toBeNull();
    expect(converted).toBeNull();
  });
});
