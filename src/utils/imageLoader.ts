/**
 * Image Utilities
 *
 * Handles image loading and processing (grayscale conversion).
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ImageLoader } from "../emitter/configEmitter.js";

// Note: sharp is an optional dependency for image processing
// If not available, we fall back to returning null

let sharpModule: typeof import("sharp") | null = null;
let sharpLoaded = false;

async function getSharp(): Promise<typeof import("sharp") | null> {
  if (sharpLoaded) {
    return sharpModule;
  }

  try {
    sharpModule = (await import("sharp")).default;
  } catch {
    // sharp not available
    sharpModule = null;
  }
  sharpLoaded = true;
  return sharpModule;
}

/**
 * Create an image loader that reads from a base directory
 */
export function createImageLoader(
  baseDir: string,
): ImageLoader & { getMissingFiles(): string[] } {
  const missingFiles: Set<string> = new Set();

  return {
    async load(imagePath: string): Promise<string | null> {
      try {
        const fullPath = path.resolve(baseDir, imagePath);
        const buffer = await fs.readFile(fullPath);
        return buffer.toString("base64");
      } catch {
        missingFiles.add(imagePath);
        return null;
      }
    },

    async toGrayscale(imagePath: string): Promise<string | null> {
      const sharp = await getSharp();
      if (!sharp) {
        // Fallback: just return the original image
        return this.load(imagePath);
      }

      try {
        const fullPath = path.resolve(baseDir, imagePath);
        const buffer = await sharp(fullPath).grayscale().png().toBuffer();
        return buffer.toString("base64");
      } catch {
        missingFiles.add(imagePath);
        return null;
      }
    },

    getMissingFiles(): string[] {
      return Array.from(missingFiles);
    },
  };
}

/**
 * Resize an image to fit button dimensions (72x72 for Stream Deck)
 */
export async function resizeForButton(
  imagePath: string,
  width = 72,
  height = 72,
): Promise<Buffer | null> {
  const sharp = await getSharp();
  if (!sharp) {
    return null;
  }

  try {
    return await sharp(imagePath)
      .resize(width, height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

/**
 * Create a grayscale version of an image
 */
export async function convertToGrayscale(
  imagePath: string,
): Promise<Buffer | null> {
  const sharp = await getSharp();
  if (!sharp) {
    return null;
  }

  try {
    return await sharp(imagePath).grayscale().png().toBuffer();
  } catch {
    return null;
  }
}
