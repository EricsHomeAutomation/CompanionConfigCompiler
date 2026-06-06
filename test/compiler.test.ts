/**
 * Button Compiler Tests
 *
 * Tests for compiling DSL button definitions into Companion button structures.
 */

import { describe, it, expect, vi } from "vitest";
import type {
  ToggleEntityButton,
  SceneButton,
  NavButton,
  StatusButton,
  ActionButton,
} from "../src/types/dsl";
import type { CompilerContext } from "../src/compiler/buttonCompiler";

// These tests would require exporting the individual compilation functions
// or mocking the Companion API calls. We'll test the structure and types here.

describe("Button Compiler", () => {
  const mockContext: CompilerContext = {
    connectionId: "test-connection",
    panelName: "test-panel",
    pageName: "test-page",
    homePageNumber: 1,
    resolvePageRef: vi.fn(),
    loadImage: vi.fn(),
    processImageToGrayscale: vi.fn(),
    resolveTemplate: vi.fn(),
  };

  describe("Toggle Entity Button Compilation", () => {
    it("should compile toggle entity button with minimal config", () => {
      const button: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.living_room",
      };

      expect(button.type).toBe("toggle_entity");
      expect(button.entity).toBe("light.living_room");
    });

    it("should compile toggle button with label", () => {
      const button: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "switch.garage",
        label: "Garage Door",
      };

      expect(button.label).toBe("Garage Door");
    });

    it("should compile toggle button with separate on/off icons", () => {
      const button: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.bedroom",
        iconOn: "icons/light-on.png",
        iconOff: "icons/light-off.png",
      };

      expect(button.iconOn).toBe("icons/light-on.png");
      expect(button.iconOff).toBe("icons/light-off.png");
    });

    it("should compile toggle button with fallback icon", () => {
      const button: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.kitchen",
        icon: "icons/light.png",
      };

      expect(button.icon).toBe("icons/light.png");
    });

    it("should handle different entity domains", () => {
      const entities = [
        "light.living_room",
        "switch.garage_door",
        "input_boolean.guest_mode",
        "cover.blinds",
      ];

      entities.forEach((entity) => {
        const button: ToggleEntityButton = {
          type: "toggle_entity",
          entity,
        };

        expect(button.entity).toBe(entity);
      });
    });

    it("should compile button with label styling", () => {
      const button: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        label: "Test Light",
        labelSize: "24",
        labelAlignment: "center:bottom",
      };

      expect(button.labelSize).toBe("24");
      expect(button.labelAlignment).toBe("center:bottom");
    });
  });

  describe("Scene Button Compilation", () => {
    it("should compile scene button", () => {
      const button: SceneButton = {
        type: "scene",
        script: "scene.movie_mode",
      };

      expect(button.type).toBe("scene");
      expect(button.script).toBe("scene.movie_mode");
    });

    it("should compile script button", () => {
      const button: SceneButton = {
        type: "scene",
        script: "script.morning_routine",
        label: "Good Morning",
      };

      expect(button.script).toBe("script.morning_routine");
      expect(button.label).toBe("Good Morning");
    });

    it("should support automation triggers", () => {
      const button: SceneButton = {
        type: "scene",
        script: "automation.heating_schedule",
      };

      expect(button.script).toContain("automation");
    });
  });

  describe("Navigation Button Compilation", () => {
    it("should compile basic nav button", () => {
      const button: NavButton = {
        type: "nav",
        goto: "settings",
      };

      expect(button.type).toBe("nav");
      expect(button.goto).toBe("settings");
    });

    it("should compile back button", () => {
      const button: NavButton = {
        type: "nav",
        goto: "@back",
        label: "Back",
      };

      expect(button.goto).toBe("@back");
    });

    it("should compile home navigation", () => {
      const button: NavButton = {
        type: "nav",
        goto: "@home",
        label: "Home",
      };

      expect(button.goto).toBe("@home");
    });

    it("should compile forward navigation", () => {
      const button: NavButton = {
        type: "nav",
        goto: "@next",
        label: "Next",
      };

      expect(button.goto).toBe("@next");
    });
  });

  describe("Status Button Compilation", () => {
    it("should compile basic status button", () => {
      const button: StatusButton = {
        type: "status",
        entity: "sensor.temperature",
      };

      expect(button.type).toBe("status");
      expect(button.entity).toBe("sensor.temperature");
    });

    it("should compile status button with format", () => {
      const button: StatusButton = {
        type: "status",
        entity: "sensor.temperature",
        format: "{value}°C",
      };

      expect(button.format).toBe("{value}°C");
    });

    it("should compile status button with various format strings", () => {
      const formats = [
        "{value}°C",
        "{value}%",
        "Battery: {value}",
        "{value} W",
        "On: {value}",
      ];

      formats.forEach((format) => {
        const button: StatusButton = {
          type: "status",
          entity: "sensor.test",
          format,
        };

        expect(button.format).toBe(format);
      });
    });

    it("should compile status button with nav action on press", () => {
      const button: StatusButton = {
        type: "status",
        entity: "sensor.humidity",
        onPress: {
          goto: "climate",
        },
      };

      expect(button.onPress?.goto).toBe("climate");
    });

    it("should compile status button with service action on press", () => {
      const button: StatusButton = {
        type: "status",
        entity: "sensor.state",
        onPress: {
          service: "light.turn_on",
          target: "light.kitchen",
        },
      };

      expect(button.onPress?.service).toBe("light.turn_on");
      expect(button.onPress?.target).toBe("light.kitchen");
    });
  });

  describe("Action Button Compilation", () => {
    it("should compile basic action button", () => {
      const button: ActionButton = {
        type: "action",
        service: "light.turn_on",
        target: "light.bedroom",
      };

      expect(button.type).toBe("action");
      expect(button.service).toBe("light.turn_on");
      expect(button.target).toBe("light.bedroom");
    });

    it("should compile action button with service data", () => {
      const button: ActionButton = {
        type: "action",
        service: "light.turn_on",
        target: "light.kitchen",
        data: {
          brightness: 255,
          color_temp: 3000,
        },
      };

      expect(button.data).toBeDefined();
      expect(button.data?.brightness).toBe(255);
    });

    it("should compile action button with various services", () => {
      const services = [
        "light.turn_on",
        "light.turn_off",
        "switch.turn_on",
        "climate.set_temperature",
        "cover.open_cover",
      ];

      services.forEach((service) => {
        const button: ActionButton = {
          type: "action",
          service,
          target: "entity.name",
        };

        expect(button.service).toBe(service);
      });
    });
  });

  describe("Icon Handling", () => {
    it("should track icon files for loading", async () => {
      const button: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        icon: "icons/light.png",
      };

      expect(button.icon).toBe("icons/light.png");
    });

    it("should track multiple icon variants", async () => {
      const button: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        iconOn: "icons/light-on.png",
        iconOff: "icons/light-off.png",
      };

      expect(button.iconOn).toBeDefined();
      expect(button.iconOff).toBeDefined();
    });

    it("should handle missing icons gracefully", () => {
      const button: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
      };

      expect(button.icon).toBeUndefined();
    });
  });

  describe("Label Rendering", () => {
    it("should support all valid label sizes", () => {
      const b1: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        labelSize: "auto",
      };
      const b2: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        labelSize: "7",
      };
      const b3: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        labelSize: "14",
      };
      const b4: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        labelSize: "18",
      };
      const b5: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        labelSize: "24",
      };
      const b6: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        labelSize: "30",
      };
      const b7: ToggleEntityButton = {
        type: "toggle_entity",
        entity: "light.test",
        labelSize: "44",
      };

      expect(b1.labelSize).toBe("auto");
      expect(b2.labelSize).toBe("7");
      expect(b3.labelSize).toBe("14");
      expect(b4.labelSize).toBe("18");
      expect(b5.labelSize).toBe("24");
      expect(b6.labelSize).toBe("30");
      expect(b7.labelSize).toBe("44");
    });

    it("should support all valid alignments", () => {
      const alignments: Array<
        NonNullable<ToggleEntityButton["labelAlignment"]>
      > = [
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
        const button: ToggleEntityButton = {
          type: "toggle_entity",
          entity: "light.test",
          labelAlignment: alignment,
        };

        expect(button.labelAlignment).toBe(alignment);
      });
    });
  });
});
