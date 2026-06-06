/**
 * Page Allocator Tests
 *
 * Tests for allocating page numbers to logical page names.
 */

import { describe, it, expect } from "vitest";
import { allocatePages } from "../src/allocator/pageAllocator";
import type { Config } from "../src/types/dsl";

describe("Page Allocator", () => {
  describe("allocatePages", () => {
    it("should allocate single panel with single page", () => {
      const config: Config = {
        version: 1,
        connections: {},
        panels: {
          "main-panel": {
            start: "home",
            pages: {
              home: {},
            },
          },
        },
      };

      const result = allocatePages(config);

      expect(result.allocations.size).toBe(1);
      const allocation = result.allocations.get("main-panel.home");
      expect(allocation).toBeDefined();
      if (allocation) {
        expect(allocation.pageNumber).toBe(1);
        expect(allocation.logicalName).toBe("home");
        expect(allocation.panelName).toBe("main-panel");
        expect(allocation.pageId).toBeDefined();
      }
    });

    it("should allocate multiple pages in order", () => {
      const config: Config = {
        version: 1,
        connections: {},
        panels: {
          "main-panel": {
            start: "home",
            pages: {
              home: {},
              settings: {},
              advanced: {},
            },
          },
        },
      };

      const result = allocatePages(config);

      expect(result.allocations.size).toBe(3);
      expect(result.allocations.get("main-panel.home")?.pageNumber).toBe(1);
      expect(result.allocations.get("main-panel.settings")?.pageNumber).toBe(2);
      expect(result.allocations.get("main-panel.advanced")?.pageNumber).toBe(3);
    });

    it("should allocate multiple panels sequentially", () => {
      const config: Config = {
        version: 1,
        connections: {},
        panels: {
          "panel-1": {
            start: "home",
            pages: {
              home: {},
              page2: {},
            },
          },
          "panel-2": {
            start: "page1",
            pages: {
              page1: {},
              page2: {},
            },
          },
        },
      };

      const result = allocatePages(config);

      expect(result.allocations.size).toBe(4);
      expect(result.allocations.get("panel-1.home")?.pageNumber).toBe(1);
      expect(result.allocations.get("panel-1.page2")?.pageNumber).toBe(2);
      expect(result.allocations.get("panel-2.page1")?.pageNumber).toBe(3);
      expect(result.allocations.get("panel-2.page2")?.pageNumber).toBe(4);
    });

    it("should respect custom start page number", () => {
      const config: Config = {
        version: 1,
        connections: {},
        panels: {
          "main-panel": {
            start: "home",
            pages: {
              home: {},
              page2: {},
            },
          },
        },
      };

      const result = allocatePages(config, { startPage: 10 });

      expect(result.allocations.get("main-panel.home")?.pageNumber).toBe(10);
      expect(result.allocations.get("main-panel.page2")?.pageNumber).toBe(11);
    });

    it("should create unique page IDs", () => {
      const config: Config = {
        version: 1,
        connections: {},
        panels: {
          panel: {
            start: "page1",
            pages: {
              page1: {},
              page2: {},
              page3: {},
            },
          },
        },
      };

      const result = allocatePages(config);

      const ids = Array.from(result.allocations.values()).map((a) => a.pageId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
      ids.forEach((id) => {
        expect(id.length).toBe(21);
      });
    });

    it("should maintain bidirectional page ID mapping", () => {
      const config: Config = {
        version: 1,
        connections: {},
        panels: {
          panel: {
            start: "page1",
            pages: {
              page1: {},
              page2: {},
            },
          },
        },
      };

      const result = allocatePages(config);

      result.pageIdToNumber.forEach((pageNumber, pageId) => {
        const reverseLookup = result.pageNumberToId.get(pageNumber);
        expect(reverseLookup).toBe(pageId);
      });
    });

    it("should handle empty panels gracefully", () => {
      const config: Config = {
        version: 1,
        connections: {},
        panels: {},
      };

      const result = allocatePages(config);

      expect(result.allocations.size).toBe(0);
      expect(result.pageIdToNumber.size).toBe(0);
      expect(result.pageNumberToId.size).toBe(0);
    });

    it("should handle panel with empty pages", () => {
      const config: Config = {
        version: 1,
        connections: {},
        panels: {
          panel: {
            start: "home",
            pages: {},
          },
        },
      };

      const result = allocatePages(config);

      expect(result.allocations.size).toBe(0);
    });

    it("should preserve panel names in allocations", () => {
      const config: Config = {
        version: 1,
        connections: {},
        panels: {
          "living-room": {
            start: "lights",
            pages: {
              lights: {},
            },
          },
          bedroom: {
            start: "lights",
            pages: {
              lights: {},
            },
          },
        },
      };

      const result = allocatePages(config);

      const allocation1 = result.allocations.get("living-room.lights");
      const allocation2 = result.allocations.get("bedroom.lights");

      expect(allocation1?.panelName).toBe("living-room");
      expect(allocation2?.panelName).toBe("bedroom");
    });
  });
});
