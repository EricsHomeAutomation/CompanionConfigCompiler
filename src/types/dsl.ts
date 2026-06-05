/**
 * DSL Schema Types
 *
 * These types define the human-friendly configuration format that users write.
 * The compiler transforms this into Companion's native JSON format.
 */

import { z } from "zod";

const LabelSizeSchema = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z.enum(["auto", "7", "14", "18", "24", "30", "44"]),
);
const LabelAlignmentSchema = z.enum([
  "left:top",
  "center:top",
  "right:top",
  "left:center",
  "center:center",
  "right:center",
  "left:bottom",
  "center:bottom",
  "right:bottom",
]);

// ============================================================================
// Button Type Definitions
// ============================================================================

/**
 * Toggle an entity on/off (lights, switches, etc.)
 */
export const ToggleEntityButtonSchema = z.object({
  type: z.literal("toggle_entity"),
  entity: z.string().describe("Home Assistant entity ID, e.g. light.patio"),
  label: z.string().optional().describe("Optional button label text"),
  labelSize: LabelSizeSchema.optional().describe(
    "Optional Companion label font size",
  ),
  labelAlignment: LabelAlignmentSchema.optional().describe(
    "Optional Companion label alignment",
  ),
  icon: z.string().optional().describe("Path to icon image"),
  iconOn: z
    .string()
    .optional()
    .describe("Path to ON state icon (overrides icon)"),
  iconOff: z
    .string()
    .optional()
    .describe("Path to OFF state icon (overrides icon)"),
});

/**
 * Call a scene or script
 */
export const SceneButtonSchema = z.object({
  type: z.literal("scene"),
  script: z.string().describe("Home Assistant script or scene ID"),
  label: z.string().optional(),
  labelSize: LabelSizeSchema.optional(),
  labelAlignment: LabelAlignmentSchema.optional(),
  icon: z.string().optional(),
});

/**
 * Navigate to another page
 */
export const NavButtonSchema = z.object({
  type: z.literal("nav"),
  goto: z.string().describe("Target page logical name"),
  label: z.string().optional(),
  labelSize: LabelSizeSchema.optional(),
  labelAlignment: LabelAlignmentSchema.optional(),
  icon: z.string().optional(),
});

/**
 * Display entity status (read-only)
 */
export const StatusButtonSchema = z.object({
  type: z.literal("status"),
  entity: z.string().describe("Home Assistant entity ID"),
  format: z.string().optional().describe('Display format, e.g. "{value}°"'),
  label: z.string().optional(),
  labelSize: LabelSizeSchema.optional(),
  labelAlignment: LabelAlignmentSchema.optional(),
  icon: z.string().optional(),
  onPress: z
    .object({
      goto: z.string().optional(),
      service: z.string().optional(),
      target: z.string().optional(),
    })
    .optional()
    .describe("Optional action when pressed"),
});

/**
 * Call a one-shot service action
 */
export const ActionButtonSchema = z.object({
  type: z.literal("action"),
  service: z
    .string()
    .describe("Home Assistant service, e.g. media_player.media_pause"),
  target: z.string().describe("Target entity ID"),
  label: z.string().optional(),
  labelSize: LabelSizeSchema.optional(),
  labelAlignment: LabelAlignmentSchema.optional(),
  icon: z.string().optional(),
  data: z.record(z.unknown()).optional().describe("Additional service data"),
});

/**
 * Empty/blank button
 */
export const EmptyButtonSchema = z.object({
  type: z.literal("empty"),
});

/**
 * Template reference button - uses a predefined template with optional overrides
 */
export const TemplateButtonSchema = z.object({
  type: z.literal("template"),
  template: z.string().describe("Name of the template to use"),
  // Override any template properties
  entity: z.string().optional(),
  script: z.string().optional(),
  goto: z.string().optional(),
  service: z.string().optional(),
  target: z.string().optional(),
  label: z.string().optional(),
  labelSize: LabelSizeSchema.optional(),
  labelAlignment: LabelAlignmentSchema.optional(),
  icon: z.string().optional(),
  iconOn: z.string().optional(),
  iconOff: z.string().optional(),
  format: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

/**
 * Union of all button types
 */
export const ButtonSchema = z.discriminatedUnion("type", [
  ToggleEntityButtonSchema,
  SceneButtonSchema,
  NavButtonSchema,
  StatusButtonSchema,
  ActionButtonSchema,
  EmptyButtonSchema,
  TemplateButtonSchema,
]);

export type ToggleEntityButton = z.infer<typeof ToggleEntityButtonSchema>;
export type SceneButton = z.infer<typeof SceneButtonSchema>;
export type NavButton = z.infer<typeof NavButtonSchema>;
export type StatusButton = z.infer<typeof StatusButtonSchema>;
export type ActionButton = z.infer<typeof ActionButtonSchema>;
export type EmptyButton = z.infer<typeof EmptyButtonSchema>;
export type TemplateButton = z.infer<typeof TemplateButtonSchema>;
export type Button = z.infer<typeof ButtonSchema>;

// ============================================================================
// Template Definition (reusable button patterns)
// ============================================================================

/**
 * Base button template - can be any button type without the 'type' discriminator
 * The template defines a base button that can be customized when used
 */
export const ButtonTemplateSchema = z.object({
  type: z.enum(["toggle_entity", "scene", "nav", "status", "action", "empty"]),
  // All possible button properties as optional
  entity: z.string().optional(),
  script: z.string().optional(),
  goto: z.string().optional(),
  service: z.string().optional(),
  target: z.string().optional(),
  label: z.string().optional(),
  labelSize: LabelSizeSchema.optional(),
  labelAlignment: LabelAlignmentSchema.optional(),
  icon: z.string().optional(),
  iconOn: z.string().optional(),
  iconOff: z.string().optional(),
  format: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  onPress: z
    .object({
      goto: z.string().optional(),
      service: z.string().optional(),
      target: z.string().optional(),
    })
    .optional(),
});

export type ButtonTemplate = z.infer<typeof ButtonTemplateSchema>;

// ============================================================================
// Page Definition
// ============================================================================

/**
 * Page layout - maps button positions (1-6 for a 6-button panel) to button definitions
 */
export const PageSchema = z.record(
  z.coerce.number().min(1).max(32), // Position key
  ButtonSchema,
);

export type Page = z.infer<typeof PageSchema>;

// ============================================================================
// Panel Definition
// ============================================================================

export const PanelSchema = z.object({
  start: z.string().describe("Default start page logical name"),
  gridSize: z
    .object({
      rows: z.number().default(2),
      columns: z.number().default(3),
    })
    .optional()
    .describe("Panel grid size (default 2x3 for 6-button)"),
  pages: z
    .record(z.string(), PageSchema)
    .describe("Map of page name to page definition"),
});

export type Panel = z.infer<typeof PanelSchema>;

// ============================================================================
// Connection Definition (Home Assistant)
// ============================================================================

export const HomeAssistantConnectionSchema = z.object({
  type: z.literal("homeassistant-server"),
  url: z.string().url().describe("Home Assistant URL"),
  accessToken: z.string().describe("Long-lived access token"),
  ignoreCertificates: z.boolean().default(true),
});

export type HomeAssistantConnection = z.infer<
  typeof HomeAssistantConnectionSchema
>;

export const ConnectionSchema = HomeAssistantConnectionSchema; // Extend for other connection types later

export type Connection = z.infer<typeof ConnectionSchema>;

// ============================================================================
// Surface/Device Definition
// ============================================================================

export const SurfaceSchema = z.object({
  id: z
    .string()
    .describe("Surface ID from Companion (e.g., streamdeck:CL21L2A01418)"),
  name: z.string().optional().describe("Friendly name"),
  panel: z.string().describe("Panel logical name to assign"),
  brightness: z.number().min(0).max(100).default(100),
  rotation: z
    .union([
      z.literal(0),
      z.literal(90),
      z.literal(180),
      z.literal(270),
      z.literal("surface-90"),
      z.literal("surface-180"),
      z.literal("surface-270"),
    ])
    .default(0),
});

export type Surface = z.infer<typeof SurfaceSchema>;

// ============================================================================
// Root Config
// ============================================================================

export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  connections: z
    .record(z.string(), ConnectionSchema)
    .optional()
    .describe("Connection definitions"),
  templates: z
    .record(z.string(), ButtonTemplateSchema)
    .optional()
    .describe("Reusable button templates"),
  panels: z.record(z.string(), PanelSchema).describe("Panel definitions"),
  surfaces: z
    .array(SurfaceSchema)
    .optional()
    .describe("Surface/device assignments"),
  assets: z
    .object({
      iconDir: z
        .string()
        .default("./icons")
        .describe("Directory containing icon images"),
    })
    .optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

// ============================================================================
// Panel File (for multi-file configs)
// ============================================================================

/**
 * Single panel file - can be combined with other panel files
 * Each file defines one panel with its templates and surface
 */
export const PanelFileSchema = z.object({
  version: z.literal(1).default(1),

  // Panel name (used as key when merging)
  name: z.string().describe("Panel identifier (e.g., 'patio', 'entry')"),

  // Optional connection definition (merged with others)
  connection: z
    .object({
      name: z
        .string()
        .describe("Connection identifier (e.g., 'homeassistant')"),
      type: z.literal("homeassistant-server"),
      url: z.string().url(),
      accessToken: z.string(),
      ignoreCertificates: z.boolean().default(true),
    })
    .optional(),

  // Templates specific to this panel (merged with others)
  templates: z
    .record(z.string(), ButtonTemplateSchema)
    .optional()
    .describe("Reusable button templates"),

  // The panel definition
  panel: z.object({
    start: z.string().describe("Default start page logical name"),
    gridSize: z
      .object({
        rows: z.number().default(2),
        columns: z.number().default(3),
      })
      .optional(),
    pages: z.record(z.string(), PageSchema),
  }),

  // Optional surface assignment
  surface: z
    .object({
      id: z.string().describe("Surface ID from Companion"),
      name: z.string().optional(),
      brightness: z.number().min(0).max(100).default(100),
      rotation: z
        .union([
          z.literal(0),
          z.literal(90),
          z.literal(180),
          z.literal(270),
          z.literal("surface-90"),
          z.literal("surface-180"),
          z.literal("surface-270"),
        ])
        .default(0),
    })
    .optional(),

  assets: z
    .object({
      iconDir: z.string().default("./icons"),
    })
    .optional(),
});

export type PanelFile = z.infer<typeof PanelFileSchema>;

export function parsePanelFile(data: unknown): PanelFile {
  return PanelFileSchema.parse(data);
}

export function validatePanelFile(
  data: unknown,
): { success: true; data: PanelFile } | { success: false; error: z.ZodError } {
  const result = PanelFileSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Project File (entry point referencing panel files)
// ============================================================================

/**
 * Project file - main entry point that references panel files
 * Defines shared connections, templates, and includes panel file references
 */
export const ProjectSchema = z.object({
  version: z.literal(1).default(1),

  // Shared connection definition
  connections: z
    .record(z.string(), ConnectionSchema)
    .optional()
    .describe("Shared connection definitions"),

  // Shared templates available to all panels
  templates: z
    .record(z.string(), ButtonTemplateSchema)
    .optional()
    .describe("Shared button templates"),

  // Panel file references (relative paths)
  include: z
    .array(z.string())
    .describe(
      "Panel files to include (e.g., ['patio.panel.yaml', 'entry.panel.yaml'])",
    ),

  // Global surface assignments (can also be in panel files)
  surfaces: z.array(SurfaceSchema).optional(),

  assets: z
    .object({
      iconDir: z.string().default("./icons"),
    })
    .optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

export function parseProject(data: unknown): Project {
  return ProjectSchema.parse(data);
}

export function validateProject(
  data: unknown,
): { success: true; data: Project } | { success: false; error: z.ZodError } {
  const result = ProjectSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Parse and validate config
// ============================================================================

export function parseConfig(data: unknown): Config {
  return ConfigSchema.parse(data);
}

export function validateConfig(
  data: unknown,
): { success: true; data: Config } | { success: false; error: z.ZodError } {
  const result = ConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
