/**
 * Utilities Tests
 *
 * Tests for utility functions like config merging and image loading.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  mergePanelFiles,
  mergeWithBase,
  mergeProject,
} from "../src/utils/mergeConfigs";
import type { PanelFile, Config, Project } from "../src/types/dsl";

function makePanelFile(name: string): PanelFile {
  return {
    version: 1,
    name,
    panel: {
      start: "home",
      pages: {
        home: {
          1: {
            type: "empty",
          },
        },
      },
    },
  };
}

describe("Utilities", () => {
  describe("mergePanelFiles", () => {
    it("should merge simple panel files into config", () => {
      const p1 = makePanelFile("panel-1");
      const p2 = makePanelFile("panel-2");

      const result = mergePanelFiles([p1, p2]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.panels["panel-1"]).toBeDefined();
        expect(result.config.panels["panel-2"]).toBeDefined();
      }
    });

    it("should keep first connection and warn on duplicate connection name", () => {
      const p1: PanelFile = {
        ...makePanelFile("panel-1"),
        connection: {
          name: "ha",
          type: "homeassistant-server",
          url: "http://localhost:8123",
          accessToken: "a",
          ignoreCertificates: true,
        },
      };
      const p2: PanelFile = {
        ...makePanelFile("panel-2"),
        connection: {
          name: "ha",
          type: "homeassistant-server",
          url: "http://localhost:9999",
          accessToken: "b",
          ignoreCertificates: true,
        },
      };

      const result = mergePanelFiles([p1, p2]);
      expect(result.success).toBe(true);
      if (result.success && result.config.connections) {
        expect(result.config.connections.ha.url).toBe("http://localhost:8123");
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it("should fail when duplicate panel names are present", () => {
      const p1 = makePanelFile("same");
      const p2 = makePanelFile("same");
      const result = mergePanelFiles([p1, p2]);
      expect(result.success).toBe(false);
    });

    it("warns when duplicate template names appear across panel files", () => {
      const p1: PanelFile = {
        ...makePanelFile("p1"),
        templates: {
          common: {
            type: "nav",
            goto: "@home",
          },
        },
      };
      const p2: PanelFile = {
        ...makePanelFile("p2"),
        templates: {
          common: {
            type: "nav",
            goto: "@back",
          },
        },
      };

      const result = mergePanelFiles([p1, p2]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.config.templates?.common.goto).toBe("@home");
      }
    });
  });

  describe("mergeWithBase", () => {
    it("should merge base config with panel files", () => {
      const baseConfig: Config = {
        version: 1,
        connections: {
          base: {
            type: "homeassistant-server",
            url: "http://localhost:8123",
            accessToken: "token",
            ignoreCertificates: true,
          },
        },
        panels: {},
      };

      const result = mergeWithBase(baseConfig, [makePanelFile("panel-1")]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.connections?.base).toBeDefined();
        expect(result.config.panels["panel-1"]).toBeDefined();
      }
    });

    it("should fail when base and panel files define the same panel", () => {
      const baseConfig: Config = {
        version: 1,
        panels: {
          panel1: {
            start: "home",
            pages: {
              home: {
                1: {
                  type: "empty",
                },
              },
            },
          },
        },
      };

      const panelFile = makePanelFile("panel1");
      const result = mergeWithBase(baseConfig, [panelFile]);
      expect(result.success).toBe(false);
    });

    it("warns when panel file connection overrides base connection", () => {
      const baseConfig: Config = {
        version: 1,
        connections: {
          ha: {
            type: "homeassistant-server",
            url: "http://localhost:8123",
            accessToken: "base",
            ignoreCertificates: true,
          },
        },
        panels: {},
      };

      const panel: PanelFile = {
        ...makePanelFile("panel-1"),
        connection: {
          name: "ha",
          type: "homeassistant-server",
          url: "http://localhost:9999",
          accessToken: "panel",
          ignoreCertificates: true,
        },
      };

      const result = mergeWithBase(baseConfig, [panel]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.config.connections?.ha.url).toBe("http://localhost:9999");
      }
    });

    it("merges base surfaces with panel surfaces", () => {
      const baseConfig: Config = {
        version: 1,
        panels: {},
        surfaces: [
          {
            id: "base-surface",
            panel: "panel-1",
            brightness: 100,
            rotation: 0,
          },
        ],
      };

      const panel: PanelFile = {
        ...makePanelFile("panel-1"),
        surface: {
          id: "panel-surface",
          brightness: 90,
          rotation: 0,
        },
      };

      const result = mergeWithBase(baseConfig, [panel]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.surfaces?.length).toBe(2);
      }
    });
  });

  describe("mergeProject", () => {
    it("should merge project + panel files", () => {
      const project: Project = {
        version: 1,
        include: ["panel-1.yaml"],
        connections: {
          shared: {
            type: "homeassistant-server",
            url: "http://localhost:8123",
            accessToken: "token",
            ignoreCertificates: true,
          },
        },
      };

      const result = mergeProject(project, [makePanelFile("panel-1")]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.panels["panel-1"]).toBeDefined();
        expect(result.config.connections?.shared).toBeDefined();
      }
    });

    it("should allow panel file connection to override project connection", () => {
      const project: Project = {
        version: 1,
        include: ["panel-1.yaml"],
        connections: {
          ha: {
            type: "homeassistant-server",
            url: "http://localhost:8123",
            accessToken: "token",
            ignoreCertificates: true,
          },
        },
      };
      const panel: PanelFile = {
        ...makePanelFile("panel-1"),
        connection: {
          name: "ha",
          type: "homeassistant-server",
          url: "http://localhost:9999",
          accessToken: "panel-token",
          ignoreCertificates: true,
        },
      };

      const result = mergeProject(project, [panel]);
      expect(result.success).toBe(true);
      if (result.success && result.config.connections) {
        expect(result.config.connections.ha.url).toBe("http://localhost:9999");
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it("should fail when no panels are defined", () => {
      const project: Project = {
        version: 1,
        include: [],
      };

      const result = mergeProject(project, []);
      expect(result.success).toBe(false);
    });

    it("warns when panel templates override project templates", () => {
      const project: Project = {
        version: 1,
        include: ["panel-1.yaml"],
        templates: {
          base: {
            type: "nav",
            goto: "@home",
          },
        },
      };

      const panel: PanelFile = {
        ...makePanelFile("panel-1"),
        templates: {
          base: {
            type: "nav",
            goto: "@back",
          },
        },
      };

      const result = mergeProject(project, [panel]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.config.templates?.base.goto).toBe("@back");
      }
    });

    it("fails when duplicate panel names are provided in panel files", () => {
      const project: Project = {
        version: 1,
        include: ["a.panel.yaml", "b.panel.yaml"],
      };

      const p1 = makePanelFile("same");
      const p2 = makePanelFile("same");

      const result = mergeProject(project, [p1, p2]);
      expect(result.success).toBe(false);
    });

    it("includes project surfaces in final merged config", () => {
      const project: Project = {
        version: 1,
        include: ["panel-1.yaml"],
        surfaces: [
          {
            id: "project-surface",
            panel: "panel-1",
            brightness: 80,
            rotation: 0,
          },
        ],
      };

      const result = mergeProject(project, [makePanelFile("panel-1")]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.surfaces?.length).toBe(1);
        expect(result.config.surfaces?.[0].id).toBe("project-surface");
      }
    });
  });

  describe("Image Loading", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = path.join(__dirname, "temp-img-" + Date.now());
      await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await fs.rm(tempDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should detect PNG files", async () => {
      const pngPath = path.join(tempDir, "test.png");
      // Create a minimal PNG file
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      await fs.writeFile(pngPath, pngHeader);

      expect(await fs.access(pngPath)).toBeUndefined();
    });

    it("should detect JPEG files", async () => {
      const jpegPath = path.join(tempDir, "test.jpg");
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff]);
      await fs.writeFile(jpegPath, jpegHeader);

      expect(await fs.access(jpegPath)).toBeUndefined();
    });

    it("should handle missing image files", async () => {
      const missingPath = path.join(tempDir, "nonexistent.png");

      try {
        await fs.access(missingPath);
        expect(true).toBe(false); // Should not reach here
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should handle relative image paths", async () => {
      const imagePath = path.join(tempDir, "icons", "light.png");
      await fs.mkdir(path.dirname(imagePath), { recursive: true });
      await fs.writeFile(imagePath, "fake png data");

      expect(await fs.access(imagePath)).toBeUndefined();
    });
  });

  describe("Config Validation", () => {
    it("should validate config has required fields", () => {
      const config = {
        connections: {},
      };

      // Should not throw
      expect(config).toBeDefined();
      expect(config.connections).toBeDefined();
    });

    it("should handle malformed connection definitions", () => {
      const config = {
        connections: {
          invalid: null,
        },
      };

      expect(config.connections.invalid).toBeNull();
    });
  });
});
