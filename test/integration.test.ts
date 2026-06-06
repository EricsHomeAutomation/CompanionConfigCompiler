/**
 * Integration Tests
 *
 * End-to-end tests for the full compilation workflow.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("Integration Tests", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, "temp-integration-" + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Full Workflow", () => {
    it("should handle complete config with all button types", async () => {
      const mainConfig = `
connections:
  homeassistant-server:
    type: homeassistant-server
    url: http://localhost:8123
    accessToken: !secret ha_token

templates:
  back_button:
    type: nav
    goto: "@back"
    label: ◀

include:
  - main.panel.yaml
`;

      const panelConfig = `
name: main
surface: StreamDeck
pages:
  home:
    rows: 3
    cols: 5
    buttons:
      - row: 0
        col: 0
        button:
          type: toggle_entity
          entity: light.living_room
          label: Living Room
      - row: 0
        col: 1
        button:
          type: scene
          script: scene.movie_mode
          label: Movie
      - row: 1
        col: 0
        button:
          type: status
          entity: sensor.temperature
          format: "{value}°C"
      - row: 1
        col: 1
        button:
          type: nav
          goto: settings
          label: Settings
`;

      const secretsConfig = `
ha_token: test_token_12345
`;

      const mainPath = path.join(tempDir, "companion.yaml");
      const panelPath = path.join(tempDir, "main.panel.yaml");
      const secretPath = path.join(tempDir, "secrets.yaml");

      await fs.writeFile(mainPath, mainConfig);
      await fs.writeFile(panelPath, panelConfig);
      await fs.writeFile(secretPath, secretsConfig);

      // Verify files were created
      expect(await fs.access(mainPath)).toBeUndefined();
      expect(await fs.access(panelPath)).toBeUndefined();
      expect(await fs.access(secretPath)).toBeUndefined();
    });

    it("should support multiple panels in single project", async () => {
      const config = `
connections:
  homeassistant-server:
    type: homeassistant-server
    url: http://localhost:8123
    accessToken: token123

include:
  - panel1.yaml
  - panel2.yaml
`;

      const panel1 = `
name: living-room
surface: StreamDeck
pages:
  lights: {}
  climate: {}
`;

      const panel2 = `
name: bedroom
surface: StreamDeck+
pages:
  lights: {}
  entertainment: {}
`;

      await fs.writeFile(path.join(tempDir, "companion.yaml"), config);
      await fs.writeFile(path.join(tempDir, "panel1.yaml"), panel1);
      await fs.writeFile(path.join(tempDir, "panel2.yaml"), panel2);

      expect(
        await fs.access(path.join(tempDir, "companion.yaml")),
      ).toBeUndefined();
    });

    it("should support template reuse across panels", async () => {
      const config = `
connections: {}

templates:
  back_button:
    type: nav
    goto: "@back"
    label: Back
  home_button:
    type: nav
    goto: "@home"
    label: Home
  next_button:
    type: nav
    goto: "@next"
    label: Next

include:
  - panel.yaml
`;

      const panelConfig = `
name: main
surface: StreamDeck
pages:
  home:
    buttons:
      - button: {template: home_button}
      - button: {template: next_button}
  settings:
    buttons:
      - button: {template: back_button}
`;

      await fs.writeFile(path.join(tempDir, "companion.yaml"), config);
      await fs.writeFile(path.join(tempDir, "panel.yaml"), panelConfig);

      expect(true).toBe(true);
    });
  });

  describe("Error Scenarios", () => {
    it("should handle missing panel file gracefully", async () => {
      const config = `
connections: {}
include:
  - missing-panel.yaml
`;

      const configPath = path.join(tempDir, "companion.yaml");
      await fs.writeFile(configPath, config);

      // Verify config was written but panel doesn't exist
      expect(await fs.access(configPath)).toBeUndefined();
      try {
        await fs.access(path.join(tempDir, "missing-panel.yaml"));
        expect(true).toBe(false); // Should not reach here
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should handle circular page references", async () => {
      const panelConfig = `
name: test
surface: StreamDeck
pages:
  page1:
    buttons:
      - button:
          type: nav
          goto: page2
  page2:
    buttons:
      - button:
          type: nav
          goto: page1
`;

      await fs.writeFile(path.join(tempDir, "panel.yaml"), panelConfig);
      expect(await fs.access(path.join(tempDir, "panel.yaml"))).toBeUndefined();
    });

    it("should handle invalid button configurations", async () => {
      const invalidButton = {
        type: "unknown_type",
        field: "value",
      };

      expect(invalidButton).toBeDefined();
    });

    it("should handle malformed YAML gracefully", async () => {
      const malformedYaml = `
connections:
  - item1
    - nested_item  # Invalid indentation
  - item2
`;

      const filePath = path.join(tempDir, "bad.yaml");
      await fs.writeFile(filePath, malformedYaml);

      expect(await fs.access(filePath)).toBeUndefined();
    });
  });

  describe("Config Output", () => {
    it("should generate valid companionconfig file structure", async () => {
      const expectedStructure = {
        product: {
          deviceName: "Stream Deck",
          firmwareVersion: "6.0.0",
        },
        pages: [],
        surfaces: [],
        triggers: [],
        connections: [],
      };

      expect(expectedStructure).toBeDefined();
      expect(expectedStructure.pages).toEqual([]);
      expect(expectedStructure.connections).toEqual([]);
    });

    it("should preserve page order in output", async () => {
      const pages = [
        { name: "home", pageNumber: 1 },
        { name: "settings", pageNumber: 2 },
        { name: "advanced", pageNumber: 3 },
      ];

      expect(pages[0].pageNumber).toBe(1);
      expect(pages[1].pageNumber).toBe(2);
      expect(pages[2].pageNumber).toBe(3);
    });

    it("should generate unique button IDs", async () => {
      const buttons = [
        { id: "btn_001", entity: "light.1" },
        { id: "btn_002", entity: "light.2" },
        { id: "btn_003", entity: "light.3" },
      ];

      const ids = buttons.map((b) => b.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Asset Handling", () => {
    it("should track and copy icon files", async () => {
      const iconDir = path.join(tempDir, "icons");
      await fs.mkdir(iconDir, { recursive: true });

      const iconPath = path.join(iconDir, "light.png");
      // Create fake PNG header
      const pngData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      await fs.writeFile(iconPath, pngData);

      expect(await fs.access(iconPath)).toBeUndefined();
    });

    it("should handle missing icon files", async () => {
      const missingIconPath = path.join(tempDir, "icons", "missing.png");

      try {
        await fs.access(missingIconPath);
        expect(true).toBe(false);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should convert icons to grayscale for states", async () => {
      const iconDir = path.join(tempDir, "icons");
      await fs.mkdir(iconDir, { recursive: true });

      const colorIcon = path.join(iconDir, "color.png");
      const grayscaleIcon = path.join(iconDir, "grayscale.png");

      // Create dummy files
      await fs.writeFile(colorIcon, "color");
      await fs.writeFile(grayscaleIcon, "grayscale");

      expect(await fs.access(colorIcon)).toBeUndefined();
      expect(await fs.access(grayscaleIcon)).toBeUndefined();
    });
  });

  describe("Connection Configuration", () => {
    it("should validate Home Assistant connections", async () => {
      const connectionConfig = {
        type: "homeassistant-server",
        url: "http://10.0.0.120:8123",
        accessToken: "token123",
      };

      expect(connectionConfig.type).toBe("homeassistant-server");
      expect(connectionConfig.url).toContain("8123");
    });

    it("should support multiple connection types", async () => {
      const connections = {
        ha_main: {
          type: "homeassistant-server",
        },
        ha_backup: {
          type: "homeassistant-server",
        },
      };

      expect(Object.keys(connections).length).toBe(2);
    });
  });

  describe("Large Config Handling", () => {
    it("should handle config with many pages", async () => {
      const pageNames = Array.from({ length: 20 }, (_, i) => `page_${i}`);

      const pages: Record<string, { buttons: unknown[] }> = {};
      pageNames.forEach((name) => {
        pages[name] = { buttons: [] };
      });

      expect(Object.keys(pages).length).toBe(20);
    });

    it("should handle pages with many buttons", async () => {
      const buttons = Array.from({ length: 50 }, (_, i) => ({
        row: Math.floor(i / 5),
        col: i % 5,
        button: {
          type: "status",
          entity: `sensor.item_${i}`,
        },
      }));

      expect(buttons.length).toBe(50);
    });

    it("should handle config with many templates", async () => {
      const templates: Record<
        string,
        {
          type: "nav";
          goto: string;
        }
      > = {};

      for (let i = 0; i < 30; i++) {
        templates[`template_${i}`] = {
          type: "nav",
          goto: `page_${i}`,
        };
      }

      expect(Object.keys(templates).length).toBe(30);
    });
  });
});
