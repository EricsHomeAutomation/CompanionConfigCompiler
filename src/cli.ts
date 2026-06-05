#!/usr/bin/env node

/**
 * Companion Config Compiler CLI
 *
 * Folder-first workflow:
 * - init <dir>
 * - validate <dir>
 * - build <dir>
 */

import { Command } from "commander";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { loadProject } from "./parser/index.js";
import { emit, serializeConfig } from "./emitter/index.js";
import { createImageLoader, mergeProject } from "./utils/index.js";
import { validatePageReferences, allocatePages } from "./allocator/index.js";

const program = new Command();

const PROJECT_CANDIDATES = [
  "companion.yaml",
  "companion.yml",
  "companion.json",
];

program
  .name("ccc")
  .description("Companion Config Compiler - folder-based init/validate/build")
  .version("0.1.0");

async function findProjectFile(dirPath: string): Promise<string | null> {
  for (const candidate of PROJECT_CANDIDATES) {
    const candidatePath = path.join(dirPath, candidate);
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {
      // Continue checking candidates.
    }
  }

  return null;
}

async function resolveProjectDirAndFile(inputDir: string): Promise<{
  dirPath: string;
  projectPath: string;
}> {
  const dirPath = path.resolve(inputDir);
  const stat = await fs.stat(dirPath).catch(() => null);

  if (!stat || !stat.isDirectory()) {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  const projectPath = await findProjectFile(dirPath);
  if (!projectPath) {
    throw new Error(
      `No project file found in ${dirPath}. Expected one of: ${PROJECT_CANDIDATES.join(", ")}`,
    );
  }

  return { dirPath, projectPath };
}

function printListErrors(header: string, errors: string[]): void {
  if (errors.length === 0) {
    return;
  }

  console.error(header);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
}

program
  .command("init")
  .description(
    "Initialize a folder with a companion.yaml project and sample panel",
  )
  .argument("<dir>", "Project directory")
  .option("--force", "Overwrite existing files", false)
  .action(async (dir, options) => {
    try {
      const dirPath = path.resolve(dir);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.mkdir(path.join(dirPath, "icons"), { recursive: true });

      const projectPath = path.join(dirPath, "companion.yaml");
      const panelPath = path.join(dirPath, "main.panel.yaml");
      const secretsPath = path.join(dirPath, "secrets.yaml");

      if (!options.force) {
        const existing: string[] = [];

        for (const p of [projectPath, panelPath, secretsPath]) {
          try {
            await fs.access(p);
            existing.push(path.basename(p));
          } catch {
            // Doesn't exist.
          }
        }

        if (existing.length > 0) {
          throw new Error(
            `Refusing to overwrite existing files: ${existing.join(", ")}. Use --force to overwrite.`,
          );
        }
      }

      const projectContent = `# Companion Config Project\nversion: 1\n\nconnections:\n  homeassistant-server:\n    type: homeassistant-server\n    url: http://homeassistant.local:8123\n    accessToken: YOUR_LONG_LIVED_ACCESS_TOKEN\n    ignoreCertificates: true\n\ntemplates:\n  next_button:\n    type: nav\n    label: ▶\n\ninclude:\n  - main.panel.yaml\n`;

      const secretsContent = `# Project secrets\n# Add secret values as key/value pairs, e.g.\n# homeassistant_access_token: your_token_here\n`;

      const panelContent = `# Main Panel\nversion: 1\nname: main\n\nsurface:\n  id: streamdeck:YOUR_SERIAL\n  name: Main Panel\n  brightness: 100\n  rotation: 0\n\npanel:\n  start: home\n  gridSize:\n    rows: 2\n    columns: 3\n  pages:\n    home:\n      1:\n        type: toggle_entity\n        entity: light.example\n        label: Light\n      2:\n        type: empty\n      3:\n        type: empty\n      4:\n        type: empty\n      5:\n        type: empty\n      6:\n        type: empty\n`;

      await fs.writeFile(projectPath, projectContent, "utf-8");
      await fs.writeFile(panelPath, panelContent, "utf-8");
      await fs.writeFile(secretsPath, secretsContent, "utf-8");

      console.log(`Initialized project in: ${dirPath}`);
      console.log(`  - ${projectPath}`);
      console.log(`  - ${panelPath}`);
      console.log(`  - ${secretsPath}`);
      console.log(`  - ${path.join(dirPath, "icons")}/`);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate a folder project (strictly follows include files)")
  .argument("<dir>", "Project directory containing companion.yaml")
  .action(async (dir) => {
    try {
      const { dirPath, projectPath } = await resolveProjectDirAndFile(dir);
      const loadResult = await loadProject(projectPath);

      if (loadResult.errors.length > 0) {
        printListErrors("Parse/load errors:", loadResult.errors);
      }

      if (!loadResult.success || !loadResult.project) {
        process.exit(1);
      }

      if (loadResult.panelFiles.length === 0) {
        console.error(
          "No panel files loaded. Check the 'include' paths in your project file.",
        );
        process.exit(1);
      }

      const mergeResult = mergeProject(
        loadResult.project,
        loadResult.panelFiles,
      );
      if (!mergeResult.success) {
        printListErrors("Merge errors:", mergeResult.errors);
        process.exit(1);
      }

      if (mergeResult.warnings.length > 0) {
        printListErrors("Warnings:", mergeResult.warnings);
      }

      const config = mergeResult.config;
      const pageAllocations = allocatePages(config);
      const refErrors = validatePageReferences(
        config,
        pageAllocations.allocations,
      );

      if (refErrors.length > 0) {
        printListErrors("Validation errors:", refErrors);
        process.exit(1);
      }

      console.log("Project is valid!");
      console.log(`  Directory: ${dirPath}`);
      console.log(`  Project: ${path.basename(projectPath)}`);
      console.log(`  Included panels: ${loadResult.panelFiles.length}`);
      console.log(`  Allocated pages: ${pageAllocations.allocations.size}`);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("build")
  .description(
    "Build a folder project into Companion config (strictly follows include files)",
  )
  .argument("<dir>", "Project directory containing companion.yaml")
  .option(
    "-o, --output <file>",
    "Output file name/path (default: output.companionconfig in the project directory)",
  )
  .option("--icons <dir>", "Icons directory (default: ./icons)", "./icons")
  .option(
    "--companion-build <version>",
    "Companion build version",
    "4.2.5+8815-stable-8821dfa519",
  )
  .option("--pretty", "Pretty print output", true)
  .option("--no-pretty", "Minified output")
  .option("--strict", "Fail on missing icons or other warnings", false)
  .action(async (dir, options) => {
    try {
      const { dirPath, projectPath } = await resolveProjectDirAndFile(dir);
      const loadResult = await loadProject(projectPath);

      if (loadResult.errors.length > 0) {
        printListErrors("Parse/load errors:", loadResult.errors);
      }

      if (!loadResult.success || !loadResult.project) {
        process.exit(1);
      }

      if (loadResult.panelFiles.length === 0) {
        console.error(
          "No panel files loaded. Check the 'include' paths in your project file.",
        );
        process.exit(1);
      }

      const mergeResult = mergeProject(
        loadResult.project,
        loadResult.panelFiles,
      );
      if (!mergeResult.success) {
        printListErrors("Merge errors:", mergeResult.errors);
        process.exit(1);
      }

      if (mergeResult.warnings.length > 0) {
        printListErrors("Warnings:", mergeResult.warnings);
      }

      const config = mergeResult.config;
      const pageAllocations = allocatePages(config);
      const refErrors = validatePageReferences(
        config,
        pageAllocations.allocations,
      );

      if (refErrors.length > 0) {
        printListErrors("Validation errors:", refErrors);
        process.exit(1);
      }

      const iconsDir = path.resolve(dirPath, options.icons);
      const imageLoader = createImageLoader(iconsDir);

      const companionConfig = await emit(config, {
        companionBuild: options.companionBuild,
        imageLoader,
      });

      const missingFiles = imageLoader.getMissingFiles();
      if (missingFiles.length > 0) {
        printListErrors("Warning: Missing icon files:", missingFiles);
        if (options.strict) {
          console.error("Strict mode: failing due to missing icons");
          process.exit(1);
        }
      }

      const output = serializeConfig(companionConfig, options.pretty);

      const outputPath = options.output
        ? path.isAbsolute(options.output)
          ? options.output
          : path.resolve(dirPath, options.output)
        : path.join(dirPath, "output.companionconfig");

      await fs.writeFile(outputPath, output, "utf-8");
      console.log(
        `Built ${loadResult.panelFiles.length} panels to: ${outputPath}`,
      );
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
