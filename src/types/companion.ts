/**
 * Companion Config Types
 *
 * These types match the actual Bitfocus Companion configuration JSON structure.
 * Based on analysis of exported .companionconfig files.
 */

// ============================================================================
// Button Style
// ============================================================================

export interface CompanionButtonStyle {
  text: string;
  textExpression: boolean;
  size: "auto" | "7" | "14" | "18" | "24" | "30" | "44";
  png64: string | null;
  alignment:
    | "left:top"
    | "center:top"
    | "right:top"
    | "left:center"
    | "center:center"
    | "right:center"
    | "left:bottom"
    | "center:bottom"
    | "right:bottom";
  pngalignment:
    | "left:top"
    | "center:top"
    | "right:top"
    | "left:center"
    | "center:center"
    | "right:center"
    | "left:bottom"
    | "center:bottom"
    | "right:bottom";
  color: number; // Decimal color value (e.g., 16777215 = white)
  bgcolor: number; // Background color
  show_topbar: "default" | "always" | "never";
}

// ============================================================================
// Feedback
// ============================================================================

export interface CompanionFeedback {
  id: string; // Unique ID (nanoid)
  definitionId: string; // e.g., 'light_on_state'
  connectionId: string; // Reference to instance
  options: Record<string, unknown>;
  upgradeIndex: number;
  type: "feedback";
  style?: Partial<CompanionButtonStyle>;
  isInverted: boolean;
}

// ============================================================================
// Action
// ============================================================================

export interface CompanionAction {
  id: string;
  definitionId: string; // e.g., 'set_light_on'
  connectionId: string;
  options: Record<string, unknown>;
  upgradeIndex: number;
  type: "action";
}

// ============================================================================
// Step (action sets for button press)
// ============================================================================

export interface CompanionStep {
  action_sets: {
    down: CompanionAction[];
    up: CompanionAction[];
    [key: string]: CompanionAction[]; // For rotary actions, etc.
  };
  options: {
    runWhileHeld: unknown[];
  };
}

// ============================================================================
// Button Control
// ============================================================================

export interface CompanionButton {
  type: "button";
  style: CompanionButtonStyle;
  options: {
    stepProgression: "auto" | "manual";
    stepExpression: string;
    rotaryActions: boolean;
  };
  feedbacks: CompanionFeedback[];
  steps: Record<string, CompanionStep>; // Key is step index ("0", "1", etc.)
  localVariables: unknown[];
}

export type CompanionControl = CompanionButton; // Can extend for other control types

// ============================================================================
// Page
// ============================================================================

export interface CompanionPage {
  id: string;
  name: string;
  controls: Record<string, Record<string, CompanionControl>>; // [row][column]
  gridSize: {
    minColumn: number;
    maxColumn: number;
    minRow: number;
    maxRow: number;
  };
}

// ============================================================================
// Instance (Connection)
// ============================================================================

export interface CompanionInstance {
  moduleInstanceType: "connection";
  instance_type: string; // e.g., 'homeassistant-server'
  moduleVersionId: string;
  updatePolicy: "stable" | "beta" | "manual";
  sortOrder: number;
  label: string;
  isFirstInit: boolean;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
  lastUpgradeIndex: number;
  enabled: boolean;
}

// ============================================================================
// Surface Group Config
// ============================================================================

export interface CompanionSurfaceGroupConfig {
  name: string;
  last_page_id: string;
  startup_page_id: string;
  use_last_page: boolean;
  restrict_pages: boolean;
  allowed_page_ids: string[];
  page: number;
  last_page: number;
  startup_page: number;
  allowed_pages: number[];
}

// ============================================================================
// Surface Config
// ============================================================================

export interface CompanionSurfaceConfig {
  brightness: number;
  rotation: number | "surface-90" | "surface-180" | "surface-270";
  never_lock: boolean;
  xOffset: number;
  yOffset: number;
  groupId: string | null;
}

// ============================================================================
// Surface
// ============================================================================

export interface CompanionSurface {
  groupConfig: CompanionSurfaceGroupConfig;
  config: CompanionSurfaceConfig;
  type: string; // e.g., 'Elgato Stream Deck XL'
  integrationType: "satellite" | "usb";
  gridSize: {
    columns: number;
    rows: number;
  };
}

// ============================================================================
// Root Config
// ============================================================================

export interface CompanionConfig {
  version: number;
  type: "full" | "partial";
  companionBuild: string;
  pages: Record<string, CompanionPage>; // Key is page number ("1", "2", etc.)
  triggers: Record<string, unknown>;
  triggerCollections: unknown[];
  custom_variables: Record<string, unknown>;
  customVariablesCollections: unknown[];
  expressionVariables: Record<string, unknown>;
  expressionVariablesCollections: unknown[];
  instances: Record<string, CompanionInstance>; // Key is instance ID
  connectionCollections: unknown[];
  surfaces: Record<string, CompanionSurface>; // Key is surface ID
  surfaceGroups: Record<string, unknown>;
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Convert RGB to decimal color value used by Companion
 */
export function rgbToDecimal(r: number, g: number, b: number): number {
  return (r << 16) + (g << 8) + b;
}

/**
 * Convert hex color string to decimal
 */
export function hexToDecimal(hex: string): number {
  const clean = hex.replace("#", "");
  return parseInt(clean, 16);
}

/**
 * Create a default button style
 */
export function createDefaultButtonStyle(): CompanionButtonStyle {
  return {
    text: "",
    textExpression: false,
    size: "auto",
    png64: null,
    alignment: "center:center",
    pngalignment: "center:center",
    color: 16777215, // White
    bgcolor: 0, // Black
    show_topbar: "default",
  };
}

/**
 * Create an empty button
 */
export function createEmptyButton(): CompanionButton {
  return {
    type: "button",
    style: createDefaultButtonStyle(),
    options: {
      stepProgression: "auto",
      stepExpression: "",
      rotaryActions: false,
    },
    feedbacks: [],
    steps: {},
    localVariables: [],
  };
}

/**
 * Create a default page
 */
export function createDefaultPage(
  id: string,
  name: string,
  gridSize = { minColumn: 0, maxColumn: 2, minRow: 0, maxRow: 2 },
): CompanionPage {
  return {
    id,
    name,
    controls: {},
    gridSize,
  };
}
