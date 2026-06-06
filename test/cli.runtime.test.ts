import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { program } from "../src/cli";

describe("CLI runtime behavior", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, "temp-cli-runtime-" + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("registers init/validate/build commands", () => {
    const names = program.commands.map((c) => c.name());
    expect(names).toContain("init");
    expect(names).toContain("validate");
    expect(names).toContain("build");
  });

  it("init command creates expected project files", async () => {
    const projectDir = path.join(tempDir, "project");

    await program.parseAsync(["init", projectDir], { from: "user" });

    await expect(
      fs.access(path.join(projectDir, "companion.yaml")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(projectDir, "main.panel.yaml")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(projectDir, "secrets.yaml")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(projectDir, "icons")),
    ).resolves.toBeUndefined();
  });

  it("init exits when files exist and --force is not provided", async () => {
    const projectDir = path.join(tempDir, "existing-project");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, "companion.yaml"), "existing\n");

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    await expect(
      program.parseAsync(["init", projectDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("validate exits with error for missing directory", async () => {
    const missingDir = path.join(tempDir, "missing");

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    await expect(
      program.parseAsync(["validate", missingDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("validate succeeds for a valid minimal project", async () => {
    const projectDir = path.join(tempDir, "valid-project");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      `
version: 1
include:
  - main.panel.yaml
`,
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      `
version: 1
name: main
panel:
  start: home
  pages:
    home:
      1:
        type: empty
`,
    );

    const exitSpy = vi.spyOn(process, "exit");
    await program.parseAsync(["validate", projectDir], { from: "user" });
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("build writes output file for a valid project", async () => {
    const projectDir = path.join(tempDir, "build-project");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      `
version: 1
include:
  - main.panel.yaml
`,
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      `
version: 1
name: main
panel:
  start: home
  pages:
    home:
      1:
        type: empty
`,
    );

    const outputPath = path.join(projectDir, "out.companionconfig");
    await program.parseAsync(
      ["build", projectDir, "--output", "out.companionconfig"],
      { from: "user" },
    );

    await expect(fs.access(outputPath)).resolves.toBeUndefined();
  });

  it("build succeeds with missing icon when strict mode is disabled", async () => {
    const projectDir = path.join(tempDir, "non-strict-icons-project");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      `
version: 1
include:
  - main.panel.yaml
`,
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      `
version: 1
name: main
panel:
  start: home
  pages:
    home:
      1:
        type: scene
        script: script.turn_on
        icon: missing-icon.png
`,
    );

    await program.parseAsync(
      ["build", projectDir, "--output", "output.companionconfig"],
      { from: "user" },
    );

    await expect(
      fs.access(path.join(projectDir, "output.companionconfig")),
    ).resolves.toBeUndefined();
  });

  it("build exits in strict mode when icons are missing", async () => {
    const projectDir = path.join(tempDir, "strict-icons-project");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      `
version: 1
include:
  - main.panel.yaml
`,
    );
    await fs.writeFile(
      path.join(projectDir, "main.panel.yaml"),
      `
version: 1
name: main
panel:
  start: home
  pages:
    home:
      1:
        type: scene
        script: script.turn_on
        icon: missing-icon.png
`,
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    await expect(
      program.parseAsync(["build", projectDir, "--strict"], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });

  it("validate exits when include list yields no panel files", async () => {
    const projectDir = path.join(tempDir, "no-panels-project");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(
      path.join(projectDir, "companion.yaml"),
      `
version: 1
include: []
`,
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`process.exit:${String(code)}`);
    }) as never);

    await expect(
      program.parseAsync(["validate", projectDir], { from: "user" }),
    ).rejects.toThrow("process.exit:1");

    exitSpy.mockRestore();
  });
});
