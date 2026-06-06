import { describe, it, expect, vi } from "vitest";
import {
  compileButton,
  type CompilerContext,
} from "../src/compiler/buttonCompiler";
import type { Button, ButtonTemplate } from "../src/types/dsl";

function makeCtx(overrides?: Partial<CompilerContext>): CompilerContext {
  return {
    connectionId: "ha-conn",
    panelName: "main",
    pageName: "home",
    homePageNumber: 7,
    resolvePageRef: (name: string) =>
      name === "settings"
        ? {
            panelName: "main",
            logicalName: "settings",
            pageNumber: 9,
            pageId: "pid-settings",
          }
        : undefined,
    loadImage: vi.fn(async () => "base64-image"),
    processImageToGrayscale: vi.fn(async () => "base64-gray"),
    resolveTemplate: vi.fn(() => undefined),
    ...overrides,
  };
}

describe("compileButton runtime behavior", () => {
  it("compiles toggle_entity for lights with light feedback and toggle action", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      { type: "toggle_entity", entity: "light.kitchen", icon: "icon.png" },
      ctx,
    );

    expect(result.feedbacks).toHaveLength(2);
    expect(result.feedbacks[0].definitionId).toBe("light_on_state");
    expect(result.steps["0"].action_sets.down[0].definitionId).toBe(
      "set_light_on",
    );
  });

  it("compiles toggle_entity for switches with switch action/feedback", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      { type: "toggle_entity", entity: "switch.fountain" },
      ctx,
    );

    expect(result.feedbacks[0].definitionId).toBe("switch_state");
    expect(result.steps["0"].action_sets.down[0].definitionId).toBe(
      "set_switch",
    );
  });

  it("compiles nav @home using panel home page number", async () => {
    const ctx = makeCtx({ homePageNumber: 11 });
    const result = await compileButton({ type: "nav", goto: "@home" }, ctx);

    const action = result.steps["0"].action_sets.down[0];
    expect(action.definitionId).toBe("set_page");
    expect(action.connectionId).toBe("internal");
    expect(action.options.page).toBe(11);
  });

  it("compiles nav @back to dec_page internal action", async () => {
    const ctx = makeCtx();
    const result = await compileButton({ type: "nav", goto: "@back" }, ctx);

    const action = result.steps["0"].action_sets.down[0];
    expect(action.definitionId).toBe("dec_page");
    expect(action.connectionId).toBe("internal");
  });

  it("throws for unresolved nav target", async () => {
    const ctx = makeCtx();
    await expect(
      compileButton({ type: "nav", goto: "does-not-exist" }, ctx),
    ).rejects.toThrow("Nav target");
  });

  it("compiles status with text expression and optional onPress action", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      {
        type: "status",
        entity: "sensor.temp",
        format: "{value} C",
        onPress: { goto: "settings" },
      },
      ctx,
    );

    expect(result.style.textExpression).toBe(true);
    expect(result.style.text).toContain("$(ha-conn:sensor.temp)");
    expect(result.steps["0"].action_sets.down[0].definitionId).toBe("set_page");
  });

  it("resolves and compiles template buttons", async () => {
    const template: ButtonTemplate = {
      type: "nav",
      goto: "@home",
      label: "Home",
    };
    const ctx = makeCtx({
      resolveTemplate: vi.fn((name: string) =>
        name === "home_btn" ? template : undefined,
      ),
    });

    const result = await compileButton(
      { type: "template", template: "home_btn" },
      ctx,
    );

    expect(result.style.text).toBe("Home");
    expect(result.steps["0"].action_sets.down[0].definitionId).toBe("set_page");
  });

  it("throws for missing template", async () => {
    const ctx = makeCtx({
      resolveTemplate: vi.fn(() => undefined),
    });

    await expect(
      compileButton({ type: "template", template: "missing-template" }, ctx),
    ).rejects.toThrow("Template");
  });

  it("compiles scene button to call_service script turn_on", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      { type: "scene", script: "scene.movie_mode" },
      ctx,
    );

    const action = result.steps["0"].action_sets.down[0];
    expect(action.definitionId).toBe("call_service");
    expect(action.options.domain).toBe("script");
    expect(action.options.service).toBe("turn_on");
  });

  it("applies scene label/alignment and icon when image is available", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      {
        type: "scene",
        script: "scene.night",
        label: "Night",
        labelAlignment: "right:bottom",
        icon: "scene.png",
      },
      ctx,
    );

    expect(result.style.text).toBe("Night");
    expect(result.style.alignment).toBe("right:bottom");
    expect(result.style.png64).toBe("base64-image");
  });

  it("does not set scene icon when image loading returns null", async () => {
    const ctx = makeCtx({ loadImage: vi.fn(async () => null) });
    const result = await compileButton(
      { type: "scene", script: "scene.day", icon: "missing.png" },
      ctx,
    );

    expect(result.style.png64).toBeNull();
  });

  it("compiles action button with service call data", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      {
        type: "action",
        service: "light.turn_on",
        target: "light.kitchen",
        data: { brightness: 80 },
      },
      ctx,
    );

    const action = result.steps["0"].action_sets.down[0];
    expect(action.definitionId).toBe("call_service");
    expect(action.options.domain).toBe("light");
    expect(action.options.service).toBe("turn_on");
    expect(action.options.data).toEqual({ brightness: 80 });
  });

  it("applies action label and icon when image exists", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      {
        type: "action",
        service: "switch.turn_off",
        target: "switch.pump",
        label: "Pump Off",
        icon: "pump.png",
      },
      ctx,
    );

    expect(result.style.text).toBe("Pump Off");
    expect(result.style.png64).toBe("base64-image");
  });

  it("does not set action icon when image loading returns null", async () => {
    const ctx = makeCtx({ loadImage: vi.fn(async () => null) });
    const result = await compileButton(
      {
        type: "action",
        service: "switch.turn_off",
        target: "switch.pump",
        icon: "missing.png",
      },
      ctx,
    );

    expect(result.style.png64).toBeNull();
  });

  it("compiles status button onPress service action", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      {
        type: "status",
        entity: "sensor.mode",
        onPress: {
          service: "switch.turn_on",
          target: "switch.fountain",
        },
      },
      ctx,
    );

    const action = result.steps["0"].action_sets.down[0];
    expect(action.definitionId).toBe("call_service");
    expect(action.options.domain).toBe("switch");
    expect(action.options.service).toBe("turn_on");
  });

  it("uses entity_state feedback for non-light/switch entities", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      { type: "toggle_entity", entity: "input_boolean.guest_mode" },
      ctx,
    );

    expect(result.feedbacks[0].definitionId).toBe("entity_state");
    expect(result.feedbacks[1].definitionId).toBe("entity_state");
  });

  it("loads iconOff directly when iconOff is provided", async () => {
    const loadImage = vi.fn(async () => "on-or-off");
    const toGray = vi.fn(async () => "gray");
    const ctx = makeCtx({ loadImage, processImageToGrayscale: toGray });

    await compileButton(
      {
        type: "toggle_entity",
        entity: "light.entry",
        iconOn: "on.png",
        iconOff: "off.png",
      },
      ctx,
    );

    expect(loadImage).toHaveBeenCalledWith("on.png");
    expect(loadImage).toHaveBeenCalledWith("off.png");
    expect(toGray).not.toHaveBeenCalled();
  });

  it("does not create status step when onPress goto cannot be resolved", async () => {
    const ctx = makeCtx({ resolvePageRef: () => undefined });
    const result = await compileButton(
      {
        type: "status",
        entity: "sensor.mode",
        onPress: { goto: "missing" },
      },
      ctx,
    );

    expect(result.steps["0"]).toBeUndefined();
  });

  it("uses default status text expression when format is omitted", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      {
        type: "status",
        entity: "sensor.humidity",
      },
      ctx,
    );

    expect(result.style.text).toBe("$(ha-conn:sensor.humidity)");
    expect(result.style.textExpression).toBe(true);
  });

  it("sets status icon when loadImage succeeds", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      {
        type: "status",
        entity: "sensor.mode",
        icon: "mode.png",
      },
      ctx,
    );

    expect(result.style.png64).toBe("base64-image");
  });

  it("applies toggle label and alignment", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      {
        type: "toggle_entity",
        entity: "light.entry",
        label: "Entry",
        labelAlignment: "left:top",
      },
      ctx,
    );

    expect(result.style.text).toBe("Entry");
    expect(result.style.alignment).toBe("left:top");
  });

  it("sets nav icon and uses resolved target page", async () => {
    const ctx = makeCtx();
    const result = await compileButton(
      {
        type: "nav",
        goto: "settings",
        icon: "nav.png",
        label: "Settings",
      },
      ctx,
    );

    expect(result.style.png64).toBe("base64-image");
    expect(result.style.text).toBe("Settings");
    expect(result.steps["0"].action_sets.down[0].options.page).toBe(9);
  });

  it("resolves template overrides for icon fields and alignment", async () => {
    const template: ButtonTemplate = {
      type: "toggle_entity",
      entity: "light.default",
      label: "Default",
      labelAlignment: "center:center",
      icon: "base.png",
    };

    const ctx = makeCtx({
      resolveTemplate: vi.fn((name: string) =>
        name === "t_toggle" ? template : undefined,
      ),
    });

    const result = await compileButton(
      {
        type: "template",
        template: "t_toggle",
        entity: "light.override",
        label: "Override",
        labelAlignment: "right:bottom",
        iconOn: "on.png",
        iconOff: "off.png",
      },
      ctx,
    );

    expect(result.style.text).toBe("Override");
    expect(result.style.alignment).toBe("right:bottom");
    expect(result.feedbacks).toHaveLength(2);
  });

  it("throws on unknown button type through runtime guard", async () => {
    const ctx = makeCtx();
    const badButton = { type: "unknown" } as unknown as Button;
    await expect(compileButton(badButton, ctx)).rejects.toThrow(
      "Unknown button type",
    );
  });
});
