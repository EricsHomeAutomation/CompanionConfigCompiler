import { describe, it, expect } from "vitest";
import {
  allocatePages,
  resolvePageReference,
  getStartPage,
  validatePageReferences,
} from "../src/allocator/pageAllocator";
import type { Config } from "../src/types/dsl";

describe("Allocator Helpers", () => {
  const config: Config = {
    version: 1,
    panels: {
      main: {
        start: "home",
        pages: {
          home: {
            1: { type: "empty" },
            2: { type: "nav", goto: "settings" },
            3: { type: "nav", goto: "@home" },
          },
          settings: {
            1: { type: "nav", goto: "@back" },
          },
        },
      },
      aux: {
        start: "dashboard",
        pages: {
          dashboard: {
            1: { type: "nav", goto: "main.home" },
          },
        },
      },
    },
  };

  it("resolves local and fully-qualified page references", () => {
    const allocations = allocatePages(config).allocations;

    const local = resolvePageReference("settings", "main", allocations);
    const fq = resolvePageReference("main.home", "aux", allocations);

    expect(local?.panelName).toBe("main");
    expect(local?.logicalName).toBe("settings");
    expect(fq?.panelName).toBe("main");
    expect(fq?.logicalName).toBe("home");
  });

  it("gets panel start page allocation", () => {
    const allocationResult = allocatePages(config);
    const start = getStartPage(
      "main",
      config.panels.main,
      allocationResult.allocations,
    );

    expect(start).toBeDefined();
    expect(start?.logicalName).toBe("home");
  });

  it("validates page references and ignores special nav targets", () => {
    const allocations = allocatePages(config).allocations;
    const errors = validatePageReferences(config, allocations);

    expect(errors).toEqual([]);
  });

  it("reports missing start and nav targets", () => {
    const broken: Config = {
      version: 1,
      panels: {
        main: {
          start: "missing-start",
          pages: {
            home: {
              1: { type: "nav", goto: "missing-page" },
            },
          },
        },
      },
    };

    const allocations = allocatePages(broken).allocations;
    const errors = validatePageReferences(broken, allocations);

    expect(errors.length).toBe(2);
    expect(errors[0]).toContain("Start page");
    expect(errors[1]).toContain("Nav target");
  });
});
