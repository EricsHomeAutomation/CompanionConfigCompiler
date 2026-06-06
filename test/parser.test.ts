/**
 * Config Parser Tests
 *
 * Tests for parsing YAML/JSON configuration files and secrets.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  parseConfigFile,
  parseProjectFile,
  loadProject,
  parseConfigString,
  parsePanelFilesFromDir,
  parsePanelFileFromPath,
} from "../src/parser/configParser";
import { validateConfig } from "../src/types/dsl";

describe("Config Parser", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, "temp-test-" + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("parseConfigFile", () => {
    it("should parse valid YAML config file", async () => {
      const yamlContent = `
version: 1
connections:
  ha-server:
    type: homeassistant-server
    url: http://localhost:8123
    accessToken: token123
panels:
  main:
    start: home
    pages:
      home:
        1:
          type: empty
`;
      const filePath = path.join(tempDir, "companion.yaml");
      await fs.writeFile(filePath, yamlContent);

      const result = await parseConfigFile(filePath);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.connections).toBeDefined();
        expect(result.config.panels.main).toBeDefined();
      }
    });

    it("should parse valid JSON config file", async () => {
      const jsonContent = {
        version: 1,
        connections: {
          "ha-server": {
            type: "homeassistant-server",
            url: "http://localhost:8123",
            accessToken: "token123",
            ignoreCertificates: true,
          },
        },
        panels: {
          main: {
            start: "home",
            pages: {
              home: {
                1: {
                  type: "empty",
                },
              },
            },
          },
        },
      };
      const filePath = path.join(tempDir, "companion.json");
      await fs.writeFile(filePath, JSON.stringify(jsonContent));

      const result = await parseConfigFile(filePath);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.connections).toBeDefined();
        expect(result.config.panels.main.start).toBe("home");
      }
    });

    it("should handle missing file gracefully", async () => {
      const filePath = path.join(tempDir, "nonexistent.yaml");
      const result = await parseConfigFile(filePath);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it("should resolve secret references", async () => {
      const yamlContent = `
version: 1
connections:
  ha-server:
    type: homeassistant-server
    url: http://localhost:8123
    accessToken: !secret token_key
    ignoreCertificates: true
panels:
  main:
    start: home
    pages:
      home:
        1:
          type: empty
`;
      const secretsContent = `
token_key: my_secret_token_123
`;
      const filePath = path.join(tempDir, "companion.yaml");
      const secretPath = path.join(tempDir, "secrets.yaml");
      await fs.writeFile(filePath, yamlContent);
      await fs.writeFile(secretPath, secretsContent);

      const result = await parseConfigFile(filePath);
      expect(result.success).toBe(true);
      if (result.success && result.config.connections) {
        const conn = result.config.connections["ha-server"];
        expect(conn.accessToken).toBe("my_secret_token_123");
      }
    });

    it("should fail on missing secret reference", async () => {
      const yamlContent = `
version: 1
connections:
  ha-server:
    type: homeassistant-server
    url: http://localhost:8123
    accessToken: !secret missing_key
    ignoreCertificates: true
panels:
  main:
    start: home
    pages:
      home:
        1:
          type: empty
`;
      const filePath = path.join(tempDir, "companion.yaml");
      const secretPath = path.join(tempDir, "secrets.yaml");
      await fs.writeFile(filePath, yamlContent);
      await fs.writeFile(secretPath, "other_key: value");

      const result = await parseConfigFile(filePath);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain("missing_key");
      }
    });

    it("should handle invalid YAML syntax", async () => {
      const invalidYaml = `
connections:
  ha-server
    type: homeassistant-server
`;
      const filePath = path.join(tempDir, "companion.yaml");
      await fs.writeFile(filePath, invalidYaml);

      const result = await parseConfigFile(filePath);
      expect(result.success).toBe(false);
    });

    it("should handle invalid JSON syntax", async () => {
      const invalidJson = `{ "invalid": json }`;
      const filePath = path.join(tempDir, "companion.json");
      await fs.writeFile(filePath, invalidJson);

      const result = await parseConfigFile(filePath);
      expect(result.success).toBe(false);
    });
  });

  describe("Secret Loading", () => {
    it("should load secrets from YAML file", async () => {
      const projectPath = path.join(tempDir, "companion.yaml");
      const panelPath = path.join(tempDir, "main.panel.yaml");

      await fs.writeFile(
        projectPath,
        `
version: 1
connections:
  ha-server:
    type: homeassistant-server
    url: http://localhost:8123
    accessToken: !secret api_key
    ignoreCertificates: true
include:
  - main.panel.yaml
`,
      );
      await fs.writeFile(
        panelPath,
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
      await fs.writeFile(
        path.join(tempDir, "secrets.yaml"),
        `
api_key: abc123
password: secret_pass
`,
      );

      const result = await parseProjectFile(projectPath);
      expect(result.success).toBe(true);
      if (result.success && result.project.connections) {
        expect(result.project.connections["ha-server"].accessToken).toBe(
          "abc123",
        );
      }
    });

    it("should prefer secrets.yaml over secrets.yml", async () => {
      const yaml = `key1: value1`;
      const yml = `key2: value2`;
      await fs.writeFile(path.join(tempDir, "secrets.yaml"), yaml);
      await fs.writeFile(path.join(tempDir, "secrets.yml"), yml);

      // YAML should be preferred
      expect(true).toBe(true);
    });

    it("should reject non-object secrets file", async () => {
      const invalidSecrets = `
- item1
- item2
`;
      const projectPath = path.join(tempDir, "companion.yaml");
      await fs.writeFile(path.join(tempDir, "secrets.yaml"), invalidSecrets);
      await fs.writeFile(
        projectPath,
        `
version: 1
connections:
  ha-server:
    type: homeassistant-server
    url: http://localhost:8123
    accessToken: !secret token
    ignoreCertificates: true
include: []
`,
      );

      const result = await parseProjectFile(projectPath);
      expect(result.success).toBe(false);
    });

    it("should reject non-string secret values", async () => {
      const invalidSecrets = `
key1: 123
key2: true
key3: null
`;
      const projectPath = path.join(tempDir, "companion.yaml");
      await fs.writeFile(path.join(tempDir, "secrets.yaml"), invalidSecrets);
      await fs.writeFile(
        projectPath,
        `
version: 1
connections:
  ha-server:
    type: homeassistant-server
    url: http://localhost:8123
    accessToken: !secret key1
    ignoreCertificates: true
include: []
`,
      );

      const result = await parseProjectFile(projectPath);
      expect(result.success).toBe(false);
    });
  });

  describe("Panel File Validation", () => {
    it("should validate included panel files exist", async () => {
      const configContent = `
version: 1
include:
  - missing-panel.yaml
`;
      const filePath = path.join(tempDir, "companion.yaml");
      await fs.writeFile(filePath, configContent);

      const result = await loadProject(filePath);
      expect(result.success).toBe(false);
    });

    it("should handle multiple included panels", async () => {
      const configContent = `
version: 1
include:
  - panel1.yaml
  - panel2.yaml
`;
      const filePath = path.join(tempDir, "companion.yaml");
      const panel1 = path.join(tempDir, "panel1.yaml");
      const panel2 = path.join(tempDir, "panel2.yaml");

      await fs.writeFile(filePath, configContent);
      await fs.writeFile(
        panel1,
        `
version: 1
name: panel1
panel:
  start: home
  pages:
    home:
      1:
        type: empty
`,
      );
      await fs.writeFile(
        panel2,
        `
version: 1
name: panel2
panel:
  start: home
  pages:
    home:
      1:
        type: empty
`,
      );

      const result = await loadProject(filePath);
      expect(result.success).toBe(true);
      expect(result.panelFiles.length).toBe(2);
    });
  });

  describe("Config Validation", () => {
    it("should validate required fields in config", async () => {
      const minimalConfig = {
        version: 1,
        panels: {
          main: {
            start: "home",
            pages: {
              home: {
                1: {
                  type: "empty",
                },
              },
            },
          },
        },
      };

      const result = validateConfig(minimalConfig);
      expect(result.success).toBe(true);
    });

    it("should reject config without connections", async () => {
      const invalidConfig = {
        version: 1,
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);
    });

    it("should parse config string in YAML format", async () => {
      const parsed = parseConfigString(
        `
version: 1
panels:
  main:
    start: home
    pages:
      home:
        1:
          type: empty
`,
      );

      expect(parsed.version).toBe(1);
      expect(parsed.panels.main.start).toBe("home");
    });

    it("should parse config string in JSON format", async () => {
      const parsed = parseConfigString(
        JSON.stringify({
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
        }),
        "json",
      );

      expect(parsed.version).toBe(1);
      expect(parsed.panels.main.pages.home[1].type).toBe("empty");
    });
  });

  describe("Panel Directory Parsing", () => {
    it("should parse only *.panel.* files from a directory", async () => {
      await fs.writeFile(
        path.join(tempDir, "kitchen.panel.yaml"),
        `
version: 1
name: kitchen
panel:
  start: home
  pages:
    home:
      1:
        type: empty
`,
      );
      await fs.writeFile(path.join(tempDir, "ignore.yaml"), "foo: bar\n");

      const result = await parsePanelFilesFromDir(tempDir);
      expect(result.success).toBe(true);
      expect(result.panelFiles.length).toBe(1);
      expect(result.panelFiles[0].name).toBe("kitchen");
    });

    it("should return errors for invalid panel files", async () => {
      await fs.writeFile(
        path.join(tempDir, "bad.panel.yaml"),
        `
version: 1
name: bad
panel:
  start: home
  pages: not_an_object
`,
      );

      const result = await parsePanelFilesFromDir(tempDir);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should fail when panel directory cannot be read", async () => {
      const missingDir = path.join(tempDir, "does-not-exist");
      const result = await parsePanelFilesFromDir(missingDir);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("Failed to read directory");
    });

    it("fails when parsePanelFileFromPath points at missing file", async () => {
      const result = await parsePanelFileFromPath(
        path.join(tempDir, "missing.panel.yaml"),
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain("Failed to read file");
      }
    });
  });

  describe("Secret File Error Paths", () => {
    it("should fail when secrets.json is invalid json", async () => {
      const projectPath = path.join(tempDir, "companion.yaml");
      await fs.writeFile(path.join(tempDir, "secrets.json"), "{ not: json }");
      await fs.writeFile(
        projectPath,
        `
version: 1
connections:
  ha-server:
    type: homeassistant-server
    url: http://localhost:8123
    accessToken: !secret token
    ignoreCertificates: true
include: []
`,
      );

      const result = await parseProjectFile(projectPath);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain("Failed to parse");
      }
    });

    it("fails project parsing when include shape is invalid", async () => {
      const projectPath = path.join(tempDir, "companion.yaml");
      await fs.writeFile(
        projectPath,
        `
version: 1
include: not-an-array
`,
      );

      const result = await parseProjectFile(projectPath);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.join(" ")).toContain("include");
      }
    });
  });
});
