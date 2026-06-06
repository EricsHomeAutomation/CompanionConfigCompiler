/**
 * Type Validation Tests
 *
 * Tests for Zod schema validation of DSL types.
 */

import { describe, it, expect } from "vitest";
import {
  ToggleEntityButtonSchema,
  SceneButtonSchema,
  NavButtonSchema,
  StatusButtonSchema,
  ActionButtonSchema,
  parseConfig,
} from "../src/types/dsl";

describe("Type Validation", () => {
  describe("ToggleEntityButton", () => {
    it("should validate minimal toggle entity button", () => {
      const button = {
        type: "toggle_entity",
        entity: "light.living_room",
      };

      const result = ToggleEntityButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should validate toggle entity button with all fields", () => {
      const button = {
        type: "toggle_entity",
        entity: "light.bedroom",
        label: "Bedroom Light",
        labelSize: "24",
        labelAlignment: "center:bottom",
        icon: "icons/light.png",
        iconOn: "icons/light-on.png",
        iconOff: "icons/light-off.png",
      };

      const result = ToggleEntityButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should reject toggle button without entity", () => {
      const button = {
        type: "toggle_entity",
      };

      const result = ToggleEntityButtonSchema.safeParse(button);
      expect(result.success).toBe(false);
    });

    it("should validate numeric label size", () => {
      const button = {
        type: "toggle_entity",
        entity: "light.test",
        labelSize: 24,
      };

      const result = ToggleEntityButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should validate all label alignment options", () => {
      const alignments = [
        "left:top",
        "center:top",
        "right:top",
        "left:center",
        "center:center",
        "right:center",
        "left:bottom",
        "center:bottom",
        "right:bottom",
      ];

      alignments.forEach((alignment) => {
        const button = {
          type: "toggle_entity",
          entity: "light.test",
          labelAlignment: alignment,
        };

        const result = ToggleEntityButtonSchema.safeParse(button);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid alignment", () => {
      const button = {
        type: "toggle_entity",
        entity: "light.test",
        labelAlignment: "invalid:alignment",
      };

      const result = ToggleEntityButtonSchema.safeParse(button);
      expect(result.success).toBe(false);
    });

    it("should reject invalid label size", () => {
      const button = {
        type: "toggle_entity",
        entity: "light.test",
        labelSize: "99",
      };

      const result = ToggleEntityButtonSchema.safeParse(button);
      expect(result.success).toBe(false);
    });
  });

  describe("SceneButton", () => {
    it("should validate minimal scene button", () => {
      const button = {
        type: "scene",
        script: "scene.movie_mode",
      };

      const result = SceneButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should validate scene button with label and icon", () => {
      const button = {
        type: "scene",
        script: "script.goodnight",
        label: "Good Night",
        labelSize: "30",
        icon: "icons/moon.png",
      };

      const result = SceneButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should reject scene button without script", () => {
      const button = {
        type: "scene",
      };

      const result = SceneButtonSchema.safeParse(button);
      expect(result.success).toBe(false);
    });
  });

  describe("NavButton", () => {
    it("should validate minimal nav button", () => {
      const button = {
        type: "nav",
        goto: "settings",
      };

      const result = NavButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should validate nav button with @back reference", () => {
      const button = {
        type: "nav",
        goto: "@back",
        label: "Back",
      };

      const result = NavButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should reject nav button without goto", () => {
      const button = {
        type: "nav",
        label: "Back",
      };

      const result = NavButtonSchema.safeParse(button);
      expect(result.success).toBe(false);
    });
  });

  describe("StatusButton", () => {
    it("should validate minimal status button", () => {
      const button = {
        type: "status",
        entity: "sensor.temperature",
      };

      const result = StatusButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should validate status button with format string", () => {
      const button = {
        type: "status",
        entity: "sensor.temperature",
        format: "{value}°C",
        label: "Temperature",
      };

      const result = StatusButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should validate status button with onPress action", () => {
      const button = {
        type: "status",
        entity: "sensor.humidity",
        onPress: {
          goto: "climate",
        },
      };

      const result = StatusButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should validate status button with service call on press", () => {
      const button = {
        type: "status",
        entity: "sensor.state",
        onPress: {
          service: "climate.set_temperature",
          target: "climate.living_room",
        },
      };

      const result = StatusButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should reject status button without entity", () => {
      const button = {
        type: "status",
      };

      const result = StatusButtonSchema.safeParse(button);
      expect(result.success).toBe(false);
    });
  });

  describe("ActionButton", () => {
    it("should validate action button with service call", () => {
      const button = {
        type: "action",
        service: "light.turn_on",
        target: "light.kitchen",
        label: "Kitchen Light",
      };

      const result = ActionButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should validate action button with service data", () => {
      const button = {
        type: "action",
        service: "light.turn_on",
        target: "light.bedroom",
        data: {
          brightness: 255,
          color_temp: 3000,
        },
      };

      const result = ActionButtonSchema.safeParse(button);
      expect(result.success).toBe(true);
    });

    it("should reject action button without service", () => {
      const button = {
        type: "action",
        target: "light.kitchen",
      };

      const result = ActionButtonSchema.safeParse(button);
      expect(result.success).toBe(false);
    });
  });

  describe("Entity ID Validation", () => {
    it("should accept valid entity IDs", () => {
      const validIds = [
        "light.living_room",
        "switch.garage_door",
        "sensor.temperature_outdoor",
        "climate.main_floor",
        "media_player.bedroom_speaker",
      ];

      validIds.forEach((entityId) => {
        const button = {
          type: "toggle_entity",
          entity: entityId,
        };

        const result = ToggleEntityButtonSchema.safeParse(button);
        expect(result.success).toBe(true);
      });
    });

    it("should accept valid script/scene IDs", () => {
      const validIds = [
        "script.morning_routine",
        "scene.movie_mode",
        "automation.bedtime",
      ];

      validIds.forEach((id) => {
        const button = {
          type: "scene",
          script: id,
        };

        const result = SceneButtonSchema.safeParse(button);
        expect(result.success).toBe(true);
      });
    });
  });
});
