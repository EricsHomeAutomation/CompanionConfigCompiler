/**
 * Config Parser
 *
 * Reads and parses YAML/JSON configuration files.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  parseConfig,
  validateConfig,
  validatePanelFile,
  validateProject,
  type Config,
  type PanelFile,
  type Project,
} from "../types/dsl.js";

type SecretsMap = Record<string, string>;

const SECRET_FILE_CANDIDATES = ["secrets.yaml", "secrets.yml", "secrets.json"];
const SECRET_REF_PATTERN = /!secret\s+([A-Za-z0-9_.-]+)/g;

async function loadSecretsFromDir(dirPath: string): Promise<{
  success: boolean;
  secrets: SecretsMap;
  errors: string[];
}> {
  let secretsPath: string | null = null;

  for (const fileName of SECRET_FILE_CANDIDATES) {
    const candidatePath = path.join(dirPath, fileName);
    try {
      await fs.access(candidatePath);
      secretsPath = candidatePath;
      break;
    } catch {
      // File does not exist, continue.
    }
  }

  if (!secretsPath) {
    return { success: true, secrets: {}, errors: [] };
  }

  let content: string;
  try {
    content = await fs.readFile(secretsPath, "utf-8");
  } catch (err) {
    return {
      success: false,
      secrets: {},
      errors: [
        `Failed to read ${path.basename(secretsPath)}: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  let data: unknown;
  try {
    const ext = path.extname(secretsPath).toLowerCase();
    if (ext === ".json") {
      data = JSON.parse(content);
    } else {
      data = parseYaml(content);
    }
  } catch (err) {
    return {
      success: false,
      secrets: {},
      errors: [
        `Failed to parse ${path.basename(secretsPath)}: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  if (data == null) {
    return { success: true, secrets: {}, errors: [] };
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    return {
      success: false,
      secrets: {},
      errors: [
        `${path.basename(secretsPath)} must be a key/value object (mapping).`,
      ],
    };
  }

  const secrets: SecretsMap = {};
  const errors: string[] = [];

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value !== "string") {
      errors.push(
        `${path.basename(secretsPath)}.${key}: Secret value must be a string.`,
      );
      continue;
    }

    secrets[key] = value;
  }

  return {
    success: errors.length === 0,
    secrets,
    errors,
  };
}

function resolveSecretReferences(
  content: string,
  filePath: string,
  secrets: SecretsMap,
): { success: true; content: string } | { success: false; errors: string[] } {
  const missingKeys = new Set<string>();

  const resolved = content.replace(
    SECRET_REF_PATTERN,
    (_match, key: string) => {
      const secretValue = secrets[key];
      if (secretValue === undefined) {
        missingKeys.add(key);
        return _match;
      }

      return JSON.stringify(secretValue);
    },
  );

  if (missingKeys.size > 0) {
    const projectDir = path.dirname(filePath);
    const secretFile = path.join(projectDir, "secrets.yaml");
    const keys = Array.from(missingKeys).sort();
    return {
      success: false,
      errors: [`Missing secret key(s) in ${secretFile}: ${keys.join(", ")}`],
    };
  }

  return { success: true, content: resolved };
}

async function parseFileData(
  filePath: string,
  secrets?: SecretsMap,
): Promise<
  { success: true; data: unknown } | { success: false; errors: string[] }
> {
  const ext = path.extname(filePath).toLowerCase();

  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    return {
      success: false,
      errors: [
        `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  let data: unknown;
  try {
    if (ext === ".yaml" || ext === ".yml") {
      const secretResult = resolveSecretReferences(
        content,
        filePath,
        secrets ?? {},
      );
      if (!secretResult.success) {
        return { success: false, errors: secretResult.errors };
      }

      data = parseYaml(secretResult.content);
    } else if (ext === ".json") {
      data = JSON.parse(content);
    } else {
      try {
        const secretResult = resolveSecretReferences(
          content,
          filePath,
          secrets ?? {},
        );
        if (!secretResult.success) {
          return { success: false, errors: secretResult.errors };
        }

        data = parseYaml(secretResult.content);
      } catch {
        data = JSON.parse(content);
      }
    }
  } catch (err) {
    return {
      success: false,
      errors: [
        `Failed to parse file: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  return { success: true, data };
}

export type ParseResult =
  | {
      success: true;
      config: Config;
      filePath: string;
    }
  | {
      success: false;
      errors: string[];
      filePath: string;
    };

/**
 * Parse a config file (YAML or JSON)
 */
export async function parseConfigFile(filePath: string): Promise<ParseResult> {
  const secretsResult = await loadSecretsFromDir(path.dirname(filePath));
  if (!secretsResult.success) {
    return {
      success: false,
      errors: secretsResult.errors,
      filePath,
    };
  }

  const parsed = await parseFileData(filePath, secretsResult.secrets);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.errors,
      filePath,
    };
  }

  const result = validateConfig(parsed.data);

  if (result.success) {
    return {
      success: true,
      config: result.data,
      filePath,
    };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `${path}: ${issue.message}`;
  });

  return {
    success: false,
    errors,
    filePath,
  };
}

/**
 * Parse config from a string
 */
export function parseConfigString(
  content: string,
  format: "yaml" | "json" = "yaml",
): Config {
  const data = format === "yaml" ? parseYaml(content) : JSON.parse(content);
  return parseConfig(data);
}

// ============================================================================
// Panel File Parsing
// ============================================================================

export type PanelFileParseResult =
  | {
      success: true;
      panelFile: PanelFile;
      filePath: string;
    }
  | {
      success: false;
      errors: string[];
      filePath: string;
    };

/**
 * Parse a panel file (YAML or JSON)
 */
export async function parsePanelFileFromPath(
  filePath: string,
  options?: { secrets?: SecretsMap },
): Promise<PanelFileParseResult> {
  let secrets = options?.secrets;
  if (!secrets) {
    const secretsResult = await loadSecretsFromDir(path.dirname(filePath));
    if (!secretsResult.success) {
      return {
        success: false,
        errors: secretsResult.errors,
        filePath,
      };
    }
    secrets = secretsResult.secrets;
  }

  const parsed = await parseFileData(filePath, secrets);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.errors,
      filePath,
    };
  }

  const result = validatePanelFile(parsed.data);

  if (result.success) {
    return {
      success: true,
      panelFile: result.data,
      filePath,
    };
  }

  const errors = result.error.issues.map((issue) => {
    const pathStr = issue.path.join(".");
    return `${pathStr}: ${issue.message}`;
  });

  return {
    success: false,
    errors,
    filePath,
  };
}

/**
 * Parse multiple panel files from a directory
 */
export async function parsePanelFilesFromDir(dirPath: string): Promise<{
  success: boolean;
  panelFiles: PanelFile[];
  errors: string[];
}> {
  const panelFiles: PanelFile[] = [];
  const errors: string[] = [];

  let entries: string[];
  try {
    entries = await fs.readdir(dirPath);
  } catch (err) {
    return {
      success: false,
      panelFiles: [],
      errors: [
        `Failed to read directory: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  // Look for .panel.yaml or .panel.json files
  const panelFileNames = entries.filter(
    (e) =>
      e.endsWith(".panel.yaml") ||
      e.endsWith(".panel.yml") ||
      e.endsWith(".panel.json"),
  );

  for (const fileName of panelFileNames) {
    const fullPath = path.join(dirPath, fileName);
    const result = await parsePanelFileFromPath(fullPath);

    if (result.success) {
      panelFiles.push(result.panelFile);
    } else {
      errors.push(`${fileName}: ${result.errors.join(", ")}`);
    }
  }

  return {
    success: errors.length === 0,
    panelFiles,
    errors,
  };
}

// ============================================================================
// Project File Parsing
// ============================================================================

export type ProjectParseResult =
  | {
      success: true;
      project: Project;
      filePath: string;
    }
  | {
      success: false;
      errors: string[];
      filePath: string;
    };

/**
 * Parse a project file (YAML or JSON)
 */
export async function parseProjectFile(
  filePath: string,
  options?: { secrets?: SecretsMap },
): Promise<ProjectParseResult> {
  let secrets = options?.secrets;
  if (!secrets) {
    const secretsResult = await loadSecretsFromDir(path.dirname(filePath));
    if (!secretsResult.success) {
      return {
        success: false,
        errors: secretsResult.errors,
        filePath,
      };
    }
    secrets = secretsResult.secrets;
  }

  const parsed = await parseFileData(filePath, secrets);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.errors,
      filePath,
    };
  }

  const result = validateProject(parsed.data);

  if (result.success) {
    return {
      success: true,
      project: result.data,
      filePath,
    };
  }

  const errors = result.error.issues.map((issue) => {
    const pathStr = issue.path.join(".");
    return `${pathStr}: ${issue.message}`;
  });

  return {
    success: false,
    errors,
    filePath,
  };
}

/**
 * Load a project file and all its referenced panel files
 */
export async function loadProject(projectFilePath: string): Promise<{
  success: boolean;
  project?: Project;
  panelFiles: PanelFile[];
  errors: string[];
}> {
  const projectDir = path.dirname(projectFilePath);
  const secretsResult = await loadSecretsFromDir(projectDir);
  if (!secretsResult.success) {
    return {
      success: false,
      panelFiles: [],
      errors: secretsResult.errors,
    };
  }

  const projectResult = await parseProjectFile(projectFilePath, {
    secrets: secretsResult.secrets,
  });

  if (!projectResult.success) {
    return {
      success: false,
      panelFiles: [],
      errors: projectResult.errors,
    };
  }

  const project = projectResult.project;
  const panelFiles: PanelFile[] = [];
  const errors: string[] = [];

  // Load each referenced panel file
  for (const includePath of project.include) {
    const fullPath = path.resolve(projectDir, includePath);
    const panelResult = await parsePanelFileFromPath(fullPath, {
      secrets: secretsResult.secrets,
    });

    if (panelResult.success) {
      panelFiles.push(panelResult.panelFile);
    } else {
      errors.push(`${includePath}: ${panelResult.errors.join(", ")}`);
    }
  }

  return {
    success: errors.length === 0,
    project,
    panelFiles,
    errors,
  };
}
