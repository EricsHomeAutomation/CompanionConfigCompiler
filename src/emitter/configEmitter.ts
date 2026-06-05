/**
 * Config Emitter
 *
 * Assembles the full Companion configuration from compiled components.
 */

import type { Config, Panel, Surface, ButtonTemplate } from "../types/dsl.js";
import type {
  CompanionConfig,
  CompanionPage,
  CompanionInstance,
  CompanionSurface,
  CompanionButton,
} from "../types/companion.js";
import { createDefaultPage } from "../types/companion.js";
import {
  allocatePages,
  resolvePageReference,
  type PageAllocation,
  type PageAllocationResult,
  type AllocatorOptions,
} from "../allocator/pageAllocator.js";
import {
  compileButton,
  type CompilerContext,
} from "../compiler/buttonCompiler.js";

// ============================================================================
// Image Loader Interface
// ============================================================================

export interface ImageLoader {
  load(path: string): Promise<string | null>;
  toGrayscale(path: string): Promise<string | null>;
  /** Get list of files that failed to load */
  getMissingFiles?(): string[];
}

/**
 * Default no-op image loader (for testing or when images aren't needed)
 */
export const nullImageLoader: ImageLoader = {
  async load(_path: string) {
    return null;
  },
  async toGrayscale(_path: string) {
    return null;
  },
};

// ============================================================================
// Emitter Options
// ============================================================================

export interface EmitterOptions {
  companionBuild?: string;
  allocatorOptions?: AllocatorOptions;
  imageLoader?: ImageLoader;
  haConnectionModuleVersion?: string;
}

const DEFAULT_OPTIONS: Required<EmitterOptions> = {
  companionBuild: "4.2.5+8815-stable-8821dfa519",
  allocatorOptions: {},
  imageLoader: nullImageLoader,
  haConnectionModuleVersion: "1.2.0",
};

// ============================================================================
// Connection Builder
// ============================================================================

function generateConnectionId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = "";
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function buildHomeAssistantInstance(
  connectionConfig: Config["connections"],
  moduleVersion: string,
): Record<string, CompanionInstance> {
  const instances: Record<string, CompanionInstance> = {};

  if (!connectionConfig) {
    return instances;
  }

  for (const [name, connection] of Object.entries(connectionConfig)) {
    const id = generateConnectionId();
    instances[id] = {
      moduleInstanceType: "connection",
      instance_type: connection.type,
      moduleVersionId: moduleVersion,
      updatePolicy: "stable",
      sortOrder: 1,
      label: name,
      isFirstInit: false,
      config: {
        ignore_certificates: connection.ignoreCertificates,
        url: connection.url,
        access_token: connection.accessToken,
      },
      secrets: {},
      lastUpgradeIndex: 0,
      enabled: true,
    };
  }

  return instances;
}

// ============================================================================
// Surface Builder
// ============================================================================

function buildSurface(
  surface: Surface,
  panelStartPageAllocation: PageAllocation | undefined,
  panelGridSize: { rows: number; columns: number },
): CompanionSurface {
  const startPageId = panelStartPageAllocation?.pageId ?? "";
  const startPageNumber = panelStartPageAllocation?.pageNumber ?? 1;

  return {
    groupConfig: {
      name: surface.name ?? "Auto group",
      last_page_id: startPageId,
      startup_page_id: startPageId,
      use_last_page: true,
      restrict_pages: false,
      allowed_page_ids: [],
      page: startPageNumber,
      last_page: startPageNumber,
      startup_page: startPageNumber,
      allowed_pages: [],
    },
    config: {
      brightness: surface.brightness,
      rotation: surface.rotation,
      never_lock: false,
      xOffset: 0,
      yOffset: 0,
      groupId: null,
    },
    type: "Satellite Device", // Generic type for satellites
    integrationType: "satellite",
    gridSize: {
      columns: panelGridSize.columns,
      rows: panelGridSize.rows,
    },
  };
}

// ============================================================================
// Page Builder
// ============================================================================

function positionToRowCol(
  position: number,
  columns: number,
): { row: number; col: number } {
  // Position is 1-indexed, convert to 0-indexed row/col
  const zeroIndexed = position - 1;
  const row = Math.floor(zeroIndexed / columns);
  const col = zeroIndexed % columns;
  return { row, col };
}

async function buildPage(
  pageName: string,
  panelName: string,
  panel: Panel,
  allocation: PageAllocation,
  allAllocations: Map<string, PageAllocation>,
  connectionId: string,
  imageLoader: ImageLoader,
  templates: Record<string, ButtonTemplate> | undefined,
  homePageNumber: number,
): Promise<CompanionPage> {
  const gridSize = panel.gridSize ?? { rows: 2, columns: 3 };
  const displayName = `${panelName}:${pageName}`;
  const page = createDefaultPage(allocation.pageId, displayName, {
    minColumn: 0,
    maxColumn: gridSize.columns - 1,
    minRow: 0,
    maxRow: gridSize.rows - 1,
  });

  const pageDefinition = panel.pages[pageName];

  // Build compiler context
  const ctx: CompilerContext = {
    connectionId,
    panelName,
    pageName,
    homePageNumber,
    resolvePageRef: (ref: string) =>
      resolvePageReference(ref, panelName, allAllocations),
    loadImage: (path: string) => imageLoader.load(path),
    processImageToGrayscale: (path: string) => imageLoader.toGrayscale(path),
    resolveTemplate: (name: string) => templates?.[name],
  };

  // Compile each button
  for (const [positionStr, buttonDef] of Object.entries(pageDefinition)) {
    const position = parseInt(positionStr, 10);
    const { row, col } = positionToRowCol(position, gridSize.columns);

    const compiledButton = await compileButton(buttonDef, ctx);

    // Initialize row if needed
    if (!page.controls[row.toString()]) {
      page.controls[row.toString()] = {};
    }

    page.controls[row.toString()][col.toString()] = compiledButton;
  }

  return page;
}

// ============================================================================
// Main Emitter
// ============================================================================

export async function emit(
  config: Config,
  options: EmitterOptions = {},
): Promise<CompanionConfig> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Allocate pages
  const pageAllocations = allocatePages(config, opts.allocatorOptions);

  // Build instances/connections
  const instances = buildHomeAssistantInstance(
    config.connections,
    opts.haConnectionModuleVersion,
  );

  // Get the first connection ID (for now, we only support one HA connection)
  const connectionId = Object.keys(instances)[0] ?? "internal";

  // Build pages
  const pages: Record<string, CompanionPage> = {};

  for (const [panelName, panel] of Object.entries(config.panels)) {
    // Get the home page number for this panel
    const homePage = resolvePageReference(
      panel.start,
      panelName,
      pageAllocations.allocations,
    );
    const homePageNumber = homePage?.pageNumber ?? 1;

    for (const pageName of Object.keys(panel.pages)) {
      const key = `${panelName}.${pageName}`;
      const allocation = pageAllocations.allocations.get(key);

      if (!allocation) {
        throw new Error(`No allocation found for page ${key}`);
      }

      const compiledPage = await buildPage(
        pageName,
        panelName,
        panel,
        allocation,
        pageAllocations.allocations,
        connectionId,
        opts.imageLoader,
        config.templates,
        homePageNumber,
      );

      pages[allocation.pageNumber.toString()] = compiledPage;
    }
  }

  // Build surfaces
  const surfaces: Record<string, CompanionSurface> = {};

  if (config.surfaces) {
    for (const surface of config.surfaces) {
      const panel = config.panels[surface.panel];
      if (!panel) {
        throw new Error(
          `Surface "${surface.id}" references unknown panel "${surface.panel}"`,
        );
      }

      const startPageAllocation = resolvePageReference(
        panel.start,
        surface.panel,
        pageAllocations.allocations,
      );

      const gridSize = panel.gridSize ?? { rows: 2, columns: 3 };

      surfaces[surface.id] = buildSurface(
        surface,
        startPageAllocation,
        gridSize,
      );
    }
  }

  // Assemble final config
  const companionConfig: CompanionConfig = {
    version: 9,
    type: "full",
    companionBuild: opts.companionBuild,
    pages,
    triggers: {},
    triggerCollections: [],
    custom_variables: {},
    customVariablesCollections: [],
    expressionVariables: {},
    expressionVariablesCollections: [],
    instances,
    connectionCollections: [],
    surfaces,
    surfaceGroups: {},
  };

  return companionConfig;
}

// ============================================================================
// Serialize to JSON
// ============================================================================

export function serializeConfig(
  config: CompanionConfig,
  pretty = true,
): string {
  return JSON.stringify(config, null, pretty ? "\t" : undefined);
}
