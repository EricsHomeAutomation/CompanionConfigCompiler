import { describe, it, expect } from "vitest";
import {
  emit,
  serializeConfig,
  nullImageLoader,
} from "../src/emitter/configEmitter";
import type { Config } from "../src/types/dsl";

describe("Emitter runtime behavior", () => {
  it("null image loader returns null for both methods", async () => {
    await expect(nullImageLoader.load("x.png")).resolves.toBeNull();
    await expect(nullImageLoader.toGrayscale("x.png")).resolves.toBeNull();
  });

  it("emits pages, instances, and surfaces for valid config", async () => {
    const config: Config = {
      version: 1,
      connections: {
        homeassistant: {
          type: "homeassistant-server",
          url: "http://localhost:8123",
          accessToken: "token",
          ignoreCertificates: true,
        },
      },
      panels: {
        main: {
          start: "home",
          pages: {
            home: {
              1: { type: "empty" },
              2: { type: "nav", goto: "@home", label: "Home" },
            },
          },
        },
      },
      surfaces: [
        {
          id: "surface-1",
          panel: "main",
          brightness: 90,
          rotation: 0,
        },
      ],
    };

    const emitted = await emit(config, { imageLoader: nullImageLoader });

    expect(emitted.version).toBe(9);
    expect(Object.keys(emitted.pages).length).toBe(1);
    expect(Object.keys(emitted.instances).length).toBe(1);
    expect(emitted.surfaces["surface-1"]).toBeDefined();
    expect(emitted.pages["1"].controls["0"]["0"].type).toBe("button");
  });

  it("throws when a surface references an unknown panel", async () => {
    const config: Config = {
      version: 1,
      panels: {
        main: {
          start: "home",
          pages: { home: { 1: { type: "empty" } } },
        },
      },
      surfaces: [
        {
          id: "bad-surface",
          panel: "missing-panel",
          brightness: 100,
          rotation: 0,
        },
      ],
    };

    await expect(emit(config)).rejects.toThrow("references unknown panel");
  });

  it("serializes pretty and minified JSON", async () => {
    const config: Config = {
      version: 1,
      panels: {
        main: {
          start: "home",
          pages: { home: { 1: { type: "empty" } } },
        },
      },
    };

    const emitted = await emit(config);

    const pretty = serializeConfig(emitted, true);
    const minified = serializeConfig(emitted, false);

    expect(pretty).toContain("\n");
    expect(pretty).toContain("\t");
    expect(minified).not.toContain("\n");
  });

  it("respects allocator startPage option", async () => {
    const config: Config = {
      version: 1,
      panels: {
        main: {
          start: "home",
          pages: {
            home: {
              1: { type: "empty" },
            },
          },
        },
      },
    };

    const emitted = await emit(config, { allocatorOptions: { startPage: 10 } });
    expect(emitted.pages["10"]).toBeDefined();
  });
});
