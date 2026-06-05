/**
 * Config Merge Utility
 *
 * Combines multiple PanelFile objects into a single unified Config.
 */

import type {
  Config,
  PanelFile,
  Panel,
  Surface,
  Connection,
  ButtonTemplate,
  Project,
} from "../types/dsl.js";

export interface MergeResult {
  success: true;
  config: Config;
  warnings: string[];
}

export interface MergeError {
  success: false;
  errors: string[];
}

/**
 * Merge multiple panel files into a single config
 */
export function mergePanelFiles(
  panelFiles: PanelFile[],
): MergeResult | MergeError {
  const errors: string[] = [];
  const warnings: string[] = [];

  const connections: Record<string, Connection> = {};
  const templates: Record<string, ButtonTemplate> = {};
  const panels: Record<string, Panel> = {};
  const surfaces: Surface[] = [];

  for (const pf of panelFiles) {
    // Merge connection
    if (pf.connection) {
      const connName = pf.connection.name;
      if (connections[connName]) {
        // Check if same URL - warn if different
        const existing = connections[connName];
        if (existing.url !== pf.connection.url) {
          warnings.push(
            `Connection "${connName}" defined in multiple files with different URLs. Using first definition.`,
          );
        }
      } else {
        connections[connName] = {
          type: pf.connection.type,
          url: pf.connection.url,
          accessToken: pf.connection.accessToken,
          ignoreCertificates: pf.connection.ignoreCertificates,
        };
      }
    }

    // Merge templates
    if (pf.templates) {
      for (const [name, template] of Object.entries(pf.templates)) {
        if (templates[name]) {
          warnings.push(
            `Template "${name}" defined in multiple files. Using first definition.`,
          );
        } else {
          templates[name] = template;
        }
      }
    }

    // Add panel
    if (panels[pf.name]) {
      errors.push(`Panel "${pf.name}" defined in multiple files.`);
    } else {
      panels[pf.name] = {
        start: pf.panel.start,
        gridSize: pf.panel.gridSize,
        pages: pf.panel.pages,
      };
    }

    // Add surface (auto-assign panel name)
    if (pf.surface) {
      surfaces.push({
        id: pf.surface.id,
        name: pf.surface.name,
        panel: pf.name, // Link to this panel
        brightness: pf.surface.brightness,
        rotation: pf.surface.rotation,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const config: Config = {
    version: 1,
    connections: Object.keys(connections).length > 0 ? connections : undefined,
    templates: Object.keys(templates).length > 0 ? templates : undefined,
    panels,
    surfaces: surfaces.length > 0 ? surfaces : undefined,
  };

  return { success: true, config, warnings };
}

/**
 * Merge a base config with panel files
 * The base config can define shared connections, templates, etc.
 */
export function mergeWithBase(
  baseConfig: Config,
  panelFiles: PanelFile[],
): MergeResult | MergeError {
  const panelResult = mergePanelFiles(panelFiles);

  if (!panelResult.success) {
    return panelResult;
  }

  const warnings = [...panelResult.warnings];
  const mergedConfig = panelResult.config;

  // Merge base connections
  if (baseConfig.connections) {
    const connections = { ...baseConfig.connections };
    if (mergedConfig.connections) {
      for (const [name, conn] of Object.entries(mergedConfig.connections)) {
        if (connections[name]) {
          warnings.push(
            `Connection "${name}" in panel files overrides base config.`,
          );
        }
        connections[name] = conn;
      }
    }
    mergedConfig.connections = connections;
  }

  // Merge base templates
  if (baseConfig.templates) {
    const templates = { ...baseConfig.templates };
    if (mergedConfig.templates) {
      for (const [name, tmpl] of Object.entries(mergedConfig.templates)) {
        if (templates[name]) {
          warnings.push(
            `Template "${name}" in panel files overrides base config.`,
          );
        }
        templates[name] = tmpl;
      }
    }
    mergedConfig.templates = templates;
  }

  // Check for panel conflicts
  if (baseConfig.panels) {
    for (const panelName of Object.keys(baseConfig.panels)) {
      if (mergedConfig.panels[panelName]) {
        return {
          success: false,
          errors: [
            `Panel "${panelName}" defined in both base config and panel files.`,
          ],
        };
      }
    }
    mergedConfig.panels = { ...baseConfig.panels, ...mergedConfig.panels };
  }

  // Merge surfaces
  if (baseConfig.surfaces) {
    mergedConfig.surfaces = [
      ...baseConfig.surfaces,
      ...(mergedConfig.surfaces || []),
    ];
  }

  return { success: true, config: mergedConfig, warnings };
}

/**
 * Merge a project file with its panel files into a single Config
 * Project provides shared connections, templates; panel files provide the actual panels
 */
export function mergeProject(
  project: Project,
  panelFiles: PanelFile[],
): MergeResult | MergeError {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Start with project's shared config
  const connections: Record<string, Connection> = {
    ...(project.connections || {}),
  };
  const templates: Record<string, ButtonTemplate> = {
    ...(project.templates || {}),
  };
  const panels: Record<string, Panel> = {};
  const surfaces: Surface[] = [...(project.surfaces || [])];

  for (const pf of panelFiles) {
    // Panel files can override/add connections (but warn)
    if (pf.connection) {
      const connName = pf.connection.name;
      if (connections[connName]) {
        warnings.push(
          `Connection "${connName}" in "${pf.name}" panel file overrides project connection.`,
        );
      }
      connections[connName] = {
        type: pf.connection.type,
        url: pf.connection.url,
        accessToken: pf.connection.accessToken,
        ignoreCertificates: pf.connection.ignoreCertificates,
      };
    }

    // Merge templates (panel file templates override project templates)
    if (pf.templates) {
      for (const [name, template] of Object.entries(pf.templates)) {
        if (templates[name]) {
          warnings.push(
            `Template "${name}" in "${pf.name}" panel file overrides project template.`,
          );
        }
        templates[name] = template;
      }
    }

    // Add panel
    if (panels[pf.name]) {
      errors.push(`Panel "${pf.name}" defined in multiple files.`);
    } else {
      panels[pf.name] = {
        start: pf.panel.start,
        gridSize: pf.panel.gridSize,
        pages: pf.panel.pages,
      };
    }

    // Add surface (auto-assign panel name)
    if (pf.surface) {
      surfaces.push({
        id: pf.surface.id,
        name: pf.surface.name,
        panel: pf.name,
        brightness: pf.surface.brightness,
        rotation: pf.surface.rotation,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  if (Object.keys(panels).length === 0) {
    return {
      success: false,
      errors: [
        "No panels defined. Check that panel files are correctly referenced.",
      ],
    };
  }

  const config: Config = {
    version: 1,
    connections: Object.keys(connections).length > 0 ? connections : undefined,
    templates: Object.keys(templates).length > 0 ? templates : undefined,
    panels,
    surfaces: surfaces.length > 0 ? surfaces : undefined,
  };

  return { success: true, config, warnings };
}
