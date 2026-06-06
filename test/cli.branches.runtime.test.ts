import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

async function loadProgram() {
  vi.resetModules();
  const cliModule = await import("../src/cli");
  return cliModule.program;
}

describe("CLI branch coverage behavior", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, "temp-cli-branches-" + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("validate exits when project file cannot be parsed", async () => {
    const projectDir = path.join(tempDir, "invalid-project");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, "companion.yaml"), "version: [\n");

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    const program = await loadProgram();
    await expect(
      program.parseAsync(["validate", projectDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("validate exits on merge errors from duplicate panel names", async () => {
    const projectDir = path.join(tempDir, "duplicate-panels");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      "version: 1\ninclude:\n  - a.panel.yaml\n  - b.panel.yaml\n",
    );
    await fs.writeFile(
      path.join(projectDir, "a.panel.yaml"),
      "version: 1\nname: dup\npanel:\n  start: home\n  pages:\n    home:\n      1:\n        type: empty\n",
    );
    await fs.writeFile(
      path.join(projectDir, "b.panel.yaml"),
      "version: 1\nname: dup\npanel:\n  start: home\n  pages:\n    home:\n      1:\n        type: empty\n",
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    const program = await loadProgram();
    await expect(
      program.parseAsync(["validate", projectDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("validate exits on invalid navigation page references", async () => {
    const projectDir = path.join(tempDir, "bad-nav");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      "version: 1\ninclude:\n  - main.panel.yaml\n",
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      "version: 1\nname: main\npanel:\n  start: home\n  pages:\n    home:\n      1:\n        type: nav\n        goto: does-not-exist\n",
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    const program = await loadProgram();
    await expect(
      program.parseAsync(["validate", projectDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("validate prints warnings when panel file overrides project connection", async () => {
    const projectDir = path.join(tempDir, "validate-warnings");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      [
        "version: 1",
        "connections:",
        "  ha:",
        "    type: homeassistant-server",
        "    url: http://localhost:8123",
        "    accessToken: base-token",
        "    ignoreCertificates: true",
        "include:",
        "  - main.panel.yaml",
        "",
      ].join("\n"),
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      [
        "version: 1",
        "name: main",
        "connection:",
        "  name: ha",
        "  type: homeassistant-server",
        "  url: http://localhost:9999",
        "  accessToken: panel-token",
        "  ignoreCertificates: true",
        "panel:",
        "  start: home",
        "  pages:",
        "    home:",
        "      1:",
        "        type: empty",
        "",
      ].join("\n"),
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit");

    const program = await loadProgram();
    await program.parseAsync(["validate", projectDir], { from: "user" });

    expect(exitSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Warnings:");
  });

  it("build exits when project file cannot be parsed", async () => {
    const projectDir = path.join(tempDir, "build-invalid-project");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, "companion.yaml"), "version: [\n");

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    const program = await loadProgram();
    await expect(
      program.parseAsync(["build", projectDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("build exits when include list yields no panel files", async () => {
    const projectDir = path.join(tempDir, "build-no-panels");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      "version: 1\ninclude: []\n",
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    const program = await loadProgram();
    await expect(
      program.parseAsync(["build", projectDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("build exits on merge errors from duplicate panel names", async () => {
    const projectDir = path.join(tempDir, "build-duplicate-panels");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      "version: 1\ninclude:\n  - a.panel.yaml\n  - b.panel.yaml\n",
    );
    await fs.writeFile(
      path.join(projectDir, "a.panel.yaml"),
      "version: 1\nname: dup\npanel:\n  start: home\n  pages:\n    home:\n      1:\n        type: empty\n",
    );
    await fs.writeFile(
      path.join(projectDir, "b.panel.yaml"),
      "version: 1\nname: dup\npanel:\n  start: home\n  pages:\n    home:\n      1:\n        type: empty\n",
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    const program = await loadProgram();
    await expect(
      program.parseAsync(["build", projectDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("build prints warnings when panel file overrides project connection", async () => {
    const projectDir = path.join(tempDir, "build-warnings");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      [
        "version: 1",
        "connections:",
        "  ha:",
        "    type: homeassistant-server",
        "    url: http://localhost:8123",
        "    accessToken: base-token",
        "    ignoreCertificates: true",
        "include:",
        "  - main.panel.yaml",
        "",
      ].join("\n"),
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      [
        "version: 1",
        "name: main",
        "connection:",
        "  name: ha",
        "  type: homeassistant-server",
        "  url: http://localhost:9999",
        "  accessToken: panel-token",
        "  ignoreCertificates: true",
        "panel:",
        "  start: home",
        "  pages:",
        "    home:",
        "      1:",
        "        type: empty",
        "",
      ].join("\n"),
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const outputPath = path.join(
      projectDir,
      "build-warning-output.companionconfig",
    );

    const program = await loadProgram();
    await program.parseAsync(["build", projectDir, "--output", outputPath], {
      from: "user",
    });

    expect(errorSpy).toHaveBeenCalledWith("Warnings:");
    await expect(fs.access(outputPath)).resolves.toBeUndefined();
  });

  it("build exits on invalid navigation page references", async () => {
    const projectDir = path.join(tempDir, "build-bad-nav");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      "version: 1\ninclude:\n  - main.panel.yaml\n",
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      "version: 1\nname: main\npanel:\n  start: home\n  pages:\n    home:\n      1:\n        type: nav\n        goto: does-not-exist\n",
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    const program = await loadProgram();
    await expect(
      program.parseAsync(["build", projectDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("build supports absolute output paths", async () => {
    const projectDir = path.join(tempDir, "build-absolute-output");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      "version: 1\ninclude:\n  - main.panel.yaml\n",
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      "version: 1\nname: main\npanel:\n  start: home\n  pages:\n    home:\n      1:\n        type: empty\n",
    );

    const outputPath = path.join(tempDir, "absolute-output.companionconfig");
    const program = await loadProgram();
    await program.parseAsync(["build", projectDir, "--output", outputPath], {
      from: "user",
    });

    await expect(fs.access(outputPath)).resolves.toBeUndefined();
  });

  it("build writes default output path when --output is not provided", async () => {
    const projectDir = path.join(tempDir, "build-default-output");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      "version: 1\ninclude:\n  - main.panel.yaml\n",
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      "version: 1\nname: main\npanel:\n  start: home\n  pages:\n    home:\n      1:\n        type: empty\n",
    );

    const program = await loadProgram();
    await program.parseAsync(["build", projectDir], { from: "user" });

    await expect(
      fs.access(path.join(projectDir, "output.companionconfig")),
    ).resolves.toBeUndefined();
  });
});
