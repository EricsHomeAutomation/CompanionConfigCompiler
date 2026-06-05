/**
 * Page Allocator
 *
 * Handles mapping logical page names to Companion global page numbers.
 * Supports multiple panels with their own page ranges.
 */

import type { Config, Panel } from "../types/dsl.js";

export interface PageAllocation {
  logicalName: string;
  panelName: string;
  pageNumber: number;
  pageId: string;
}

export interface PageAllocationResult {
  allocations: Map<string, PageAllocation>; // Key: "panelName.pageName"
  pageIdToNumber: Map<string, number>; // Page ID to page number
  pageNumberToId: Map<number, string>; // Page number to page ID
}

export interface AllocatorOptions {
  /**
   * Starting page number (default: 1)
   * Pages are allocated sequentially from this number.
   */
  startPage?: number;
}

/**
 * Generate a unique page ID (similar to Companion's internal IDs)
 */
function generatePageId(): string {
  // Using a simple approach - in production would use nanoid
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = "";
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Allocate page numbers for all panels in a config
 * Pages are numbered sequentially: all Panel 1 pages first, then Panel 2, etc.
 */
export function allocatePages(
  config: Config,
  options: AllocatorOptions = {},
): PageAllocationResult {
  const { startPage = 1 } = options;

  const allocations = new Map<string, PageAllocation>();
  const pageIdToNumber = new Map<string, number>();
  const pageNumberToId = new Map<number, string>();

  let currentPageNumber = startPage;
  const panelNames = Object.keys(config.panels);

  // Allocate pages sequentially across all panels
  for (const panelName of panelNames) {
    const panel = config.panels[panelName];
    const pageNames = Object.keys(panel.pages);

    for (const pageName of pageNames) {
      const pageNumber = currentPageNumber++;
      const pageId = generatePageId();
      const key = `${panelName}.${pageName}`;

      const allocation: PageAllocation = {
        logicalName: pageName,
        panelName,
        pageNumber,
        pageId,
      };

      allocations.set(key, allocation);
      pageIdToNumber.set(pageId, pageNumber);
      pageNumberToId.set(pageNumber, pageId);
    }
  }

  return {
    allocations,
    pageIdToNumber,
    pageNumberToId,
  };
}

/**
 * Resolve a page reference within a panel context
 *
 * @param pageName - The logical page name (e.g., "home" or "other_panel.settings")
 * @param currentPanel - The current panel context
 * @param allocations - The page allocations
 * @returns The page allocation or undefined if not found
 */
export function resolvePageReference(
  pageName: string,
  currentPanel: string,
  allocations: Map<string, PageAllocation>,
): PageAllocation | undefined {
  // Check if it's a fully qualified reference (panel.page)
  if (pageName.includes(".")) {
    return allocations.get(pageName);
  }

  // Otherwise, look up within current panel
  return allocations.get(`${currentPanel}.${pageName}`);
}

/**
 * Get the start page allocation for a panel
 */
export function getStartPage(
  panelName: string,
  panel: Panel,
  allocations: Map<string, PageAllocation>,
): PageAllocation | undefined {
  return resolvePageReference(panel.start, panelName, allocations);
}

/**
 * Validate that all page references are resolvable
 */
export function validatePageReferences(
  config: Config,
  allocations: Map<string, PageAllocation>,
): string[] {
  const errors: string[] = [];

  for (const [panelName, panel] of Object.entries(config.panels)) {
    // Validate start page
    if (!resolvePageReference(panel.start, panelName, allocations)) {
      errors.push(
        `Panel "${panelName}": Start page "${panel.start}" not found`,
      );
    }

    // Validate nav button targets
    for (const [pageName, page] of Object.entries(panel.pages)) {
      for (const [position, button] of Object.entries(page)) {
        if (button.type === "nav") {
          // Skip validation for special navigation targets
          if (button.goto === "@home" || button.goto === "@back") {
            continue;
          }
          if (!resolvePageReference(button.goto, panelName, allocations)) {
            errors.push(
              `Panel "${panelName}", Page "${pageName}", Position ${position}: ` +
                `Nav target "${button.goto}" not found`,
            );
          }
        }
      }
    }
  }

  return errors;
}
