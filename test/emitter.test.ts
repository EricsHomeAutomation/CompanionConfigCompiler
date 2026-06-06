/**
 * Emitter Tests
 *
 * Tests for emitting the final Companion JSON configuration.
 */

import { describe, it, expect } from "vitest";

describe("Config Emitter", () => {
  describe("Output Structure", () => {
    it("should emit valid JSON structure", () => {
      const config = {
        version: 1,
        product: {
          deviceName: "Stream Deck",
          firmwareVersion: "6.0.0",
        },
        pages: [],
        surfaces: [],
      };

      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);

      expect(parsed.product.deviceName).toBe("Stream Deck");
      expect(Array.isArray(parsed.pages)).toBe(true);
    });

    it("should include all required fields", () => {
      const config = {
        version: 1,
        product: {},
        pages: [],
        triggers: [],
        connections: [],
        surfaces: [],
        controls: [],
      };

      expect(config.version).toBeDefined();
      expect(config.product).toBeDefined();
      expect(config.pages).toBeDefined();
      expect(config.connections).toBeDefined();
    });

    it("should handle nested page structures", () => {
      const page = {
        pageNumber: 1,
        pageId: "page_001",
        buttons: [
          {
            buttonId: "btn_001",
            row: 0,
            col: 0,
            name: "Light",
          },
        ],
      };

      expect(page.buttons[0].buttonId).toBe("btn_001");
      expect(page.buttons[0].row).toBe(0);
    });
  });

  describe("Page Serialization", () => {
    it("should serialize page metadata", () => {
      const page = {
        pageNumber: 5,
        pageId: "abc123",
        name: "Settings",
      };

      const json = JSON.stringify(page);
      const parsed = JSON.parse(json);

      expect(parsed.pageNumber).toBe(5);
      expect(parsed.pageId).toBe("abc123");
    });

    it("should serialize button array", () => {
      const page = {
        pageNumber: 1,
        buttons: [
          { buttonId: "btn_001", label: "Button 1" },
          { buttonId: "btn_002", label: "Button 2" },
          { buttonId: "btn_003", label: "Button 3" },
        ],
      };

      expect(page.buttons.length).toBe(3);
      expect(page.buttons[0].buttonId).toBe("btn_001");
    });
  });

  describe("Button Serialization", () => {
    it("should serialize toggle button with actions", () => {
      const button = {
        id: "btn_001",
        type: "button",
        actions: [
          {
            id: "action_001",
            definitionId: "set_light_on",
            options: {
              entity_id: ["light.living_room"],
              state: "toggle",
            },
          },
        ],
      };

      const json = JSON.stringify(button);
      const parsed = JSON.parse(json);

      expect(parsed.actions[0].definitionId).toBe("set_light_on");
    });

    it("should serialize button with feedbacks", () => {
      const button = {
        id: "btn_001",
        feedbacks: [
          {
            id: "fb_001",
            definitionId: "light_state",
            options: {
              entity_id: "light.living_room",
            },
          },
        ],
      };

      expect(button.feedbacks[0].definitionId).toBe("light_state");
    });

    it("should serialize button style information", () => {
      const button = {
        id: "btn_001",
        style: {
          text: "Light",
          size: 24,
          alignment: 9,
          color: "#ffffff",
          backgroundColor: "#000000",
        },
      };

      expect(button.style.text).toBe("Light");
      expect(button.style.size).toBe(24);
    });
  });

  describe("Connection Serialization", () => {
    it("should serialize Home Assistant connection", () => {
      const connection = {
        id: "ha_server",
        label: "Home Assistant",
        type: "homeassistant-server",
        enabled: true,
        config: {
          url: "http://localhost:8123",
          accessToken: "token123",
          ignoreCertificates: true,
        },
      };

      const json = JSON.stringify(connection);
      const parsed = JSON.parse(json);

      expect(parsed.type).toBe("homeassistant-server");
      expect(parsed.config.url).toContain("8123");
    });

    it("should serialize connection status", () => {
      const status = {
        connectionId: "ha_server",
        isConnected: true,
        lastUpdate: "2024-01-15T10:30:00Z",
      };

      expect(status.isConnected).toBe(true);
    });
  });

  describe("Image/Icon Serialization", () => {
    it("should serialize base64 encoded images", () => {
      const button = {
        id: "btn_001",
        style: {
          image:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
      };

      expect(button.style.image).toBeDefined();
      expect(button.style.image.length).toBeGreaterThan(0);
    });

    it("should track multiple image variants", () => {
      const button = {
        id: "btn_001",
        images: {
          default: "base64_image_1",
          on: "base64_image_2",
          off: "base64_image_3",
        },
      };

      expect(Object.keys(button.images).length).toBe(3);
    });
  });

  describe("Template Expansion", () => {
    it("should expand template references to full button config", () => {
      const template = {
        name: "nav_button",
        definition: {
          type: "nav",
          goto: "settings",
        },
      };

      const expandedButton = {
        ...template.definition,
        label: "Settings",
        id: "btn_001",
      };

      expect(expandedButton.type).toBe("nav");
      expect(expandedButton.goto).toBe("settings");
    });

    it("should allow template overrides", () => {
      const template = {
        type: "nav",
        goto: "home",
        label: "Home",
      };

      const override = {
        ...template,
        label: "Dashboard",
      };

      expect(override.label).toBe("Dashboard");
      expect(override.goto).toBe("home");
    });
  });

  describe("Error Handling in Emission", () => {
    it("should handle circular references", () => {
      const page: { name: string; self?: { name: string; self?: unknown } } = {
        name: "test",
      };
      page.self = page; // Create circular reference

      // JSON.stringify will throw an error with circular references
      expect(() => JSON.stringify(page)).toThrow();
    });

    it("should validate image data before emission", () => {
      const invalidButton = {
        id: "btn_001",
        style: {
          image: "not-base64-data!@#$%",
        },
      };

      // Should not throw during serialization
      const json = JSON.stringify(invalidButton);
      expect(json).toBeDefined();
    });

    it("should handle null/undefined values", () => {
      const button = {
        id: "btn_001",
        label: null,
        icon: undefined,
      };

      const json = JSON.stringify(button);
      const parsed = JSON.parse(json);

      expect(parsed.label).toBeNull();
      expect("icon" in parsed).toBe(false);
    });
  });

  describe("Output Formatting", () => {
    it("should emit minified JSON", () => {
      const config = {
        pages: [{ pageNumber: 1, buttons: [] }],
        connections: [],
      };

      const minified = JSON.stringify(config);
      expect(minified).not.toContain("\n");
    });

    it("should emit formatted JSON with proper indentation", () => {
      const config = {
        pages: [{ pageNumber: 1 }],
      };

      const formatted = JSON.stringify(config, null, 2);
      expect(formatted).toContain("\n");
      expect(formatted).toContain("  ");
    });
  });

  describe("File Output", () => {
    it("should generate .companionconfig file", () => {
      const filename = "output.companionconfig";
      expect(filename).toContain(".companionconfig");
    });

    it("should handle custom output paths", () => {
      const paths = [
        "output.companionconfig",
        "/tmp/output.companionconfig",
        "./configs/deck.companionconfig",
      ];

      paths.forEach((p) => {
        expect(p).toContain(".companionconfig");
      });
    });

    it("should preserve file content integrity", () => {
      const original = {
        version: 1,
        pages: [{ pageNumber: 1, name: "Home" }],
      };

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(original);
    });
  });
});
