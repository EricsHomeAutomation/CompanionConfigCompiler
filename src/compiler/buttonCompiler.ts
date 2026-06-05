/**
 * Button Compiler
 *
 * Transforms DSL button definitions into Companion button structures.
 */

import type {
  Button,
  ToggleEntityButton,
  SceneButton,
  NavButton,
  StatusButton,
  ActionButton,
  TemplateButton,
  ButtonTemplate,
} from "../types/dsl.js";
import type {
  CompanionButton,
  CompanionAction,
  CompanionFeedback,
  CompanionStep,
  CompanionButtonStyle,
} from "../types/companion.js";
import {
  createDefaultButtonStyle,
  createEmptyButton,
} from "../types/companion.js";
import type { PageAllocation } from "../allocator/pageAllocator.js";

// ============================================================================
// Compiler Context
// ============================================================================

export interface CompilerContext {
  connectionId: string;
  panelName: string;
  pageName: string;
  homePageNumber: number; // The panel's start/home page number
  resolvePageRef: (pageName: string) => PageAllocation | undefined;
  loadImage: (path: string) => Promise<string | null>; // Returns base64 or null
  processImageToGrayscale: (path: string) => Promise<string | null>;
  resolveTemplate: (templateName: string) => ButtonTemplate | undefined;
}

// ============================================================================
// ID Generation
// ============================================================================

function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = "";
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================================
// Action Builders
// ============================================================================

function createToggleAction(
  connectionId: string,
  entityId: string,
): CompanionAction {
  const entityDomain = entityId.split(".")[0];
  const definitionId =
    entityDomain === "switch" ? "set_switch" : "set_light_on";

  return {
    id: generateId(),
    definitionId,
    connectionId,
    options: {
      entity_id: [entityId],
      state: "toggle",
    },
    upgradeIndex: 0,
    type: "action",
  };
}

function createServiceCallAction(
  connectionId: string,
  service: string,
  target: string,
  data?: Record<string, unknown>,
): CompanionAction {
  const [domain, serviceName] = service.split(".");
  return {
    id: generateId(),
    definitionId: "call_service",
    connectionId,
    options: {
      domain,
      service: serviceName,
      entity_id: [target],
      data: data ?? {},
    },
    upgradeIndex: 0,
    type: "action",
  };
}

function createScriptAction(
  connectionId: string,
  scriptId: string,
): CompanionAction {
  // Scripts in HA are called via the script.turn_on service
  const entityId = scriptId.startsWith("script.")
    ? scriptId
    : `script.${scriptId}`;
  return {
    id: generateId(),
    definitionId: "call_service",
    connectionId,
    options: {
      domain: "script",
      service: "turn_on",
      entity_id: [entityId],
      data: {},
    },
    upgradeIndex: 0,
    type: "action",
  };
}

function createPageSetAction(pageNumber: number): CompanionAction {
  return {
    id: generateId(),
    definitionId: "set_page",
    connectionId: "internal",
    options: {
      page: pageNumber,
      surfaceId: "self",
      controller: "self",
    },
    upgradeIndex: 0,
    type: "action",
  };
}

function createPageBackAction(): CompanionAction {
  return {
    id: generateId(),
    definitionId: "dec_page",
    connectionId: "internal",
    options: {
      surfaceId: "self",
      controller: "self",
    },
    upgradeIndex: 0,
    type: "action",
  };
}

// ============================================================================
// Feedback Builders
// ============================================================================

function createLightStateFeedback(
  connectionId: string,
  entityId: string,
  isOn: boolean,
  png64: string | null,
): CompanionFeedback {
  return {
    id: generateId(),
    definitionId: "light_on_state",
    connectionId,
    options: {
      entity_id: entityId,
      state: isOn,
    },
    upgradeIndex: 0,
    type: "feedback",
    style: png64 ? { png64 } : undefined,
    isInverted: false,
  };
}

function createEntityStateFeedback(
  connectionId: string,
  entityId: string,
  state: string,
  png64: string | null,
): CompanionFeedback {
  return {
    id: generateId(),
    definitionId: "entity_state",
    connectionId,
    options: {
      entity_id: entityId,
      state,
    },
    upgradeIndex: 0,
    type: "feedback",
    style: png64 ? { png64 } : undefined,
    isInverted: false,
  };
}

function createSwitchStateFeedback(
  connectionId: string,
  entityId: string,
  state: boolean | string,
  png64: string | null,
): CompanionFeedback {
  return {
    id: generateId(),
    definitionId: "switch_state",
    connectionId,
    options: {
      entity_id: entityId,
      state: state,
    },
    upgradeIndex: 0,
    type: "feedback",
    style: png64 ? { png64 } : undefined,
    isInverted: false,
  };
}

// ============================================================================
// Step Builder
// ============================================================================

function createStep(
  downActions: CompanionAction[],
  upActions: CompanionAction[] = [],
): CompanionStep {
  return {
    action_sets: {
      down: downActions,
      up: upActions,
    },
    options: {
      runWhileHeld: [],
    },
  };
}

type LabelStyleOptions = {
  labelSize?: CompanionButtonStyle["size"];
  labelAlignment?: CompanionButtonStyle["alignment"];
};

function applyLabelStyle(
  button: LabelStyleOptions,
  result: CompanionButton,
): void {
  if (button.labelSize) {
    result.style.size = button.labelSize;
  }

  if (button.labelAlignment) {
    result.style.alignment = button.labelAlignment;
  }
}

// ============================================================================
// Button Compilers
// ============================================================================

async function compileToggleEntityButton(
  button: ToggleEntityButton,
  ctx: CompilerContext,
): Promise<CompanionButton> {
  const result = createEmptyButton();

  applyLabelStyle(button, result);

  // Set label if provided
  if (button.label) {
    result.style.text = button.label;
  }

  // Load images
  let onImage: string | null = null;
  let offImage: string | null = null;

  if (button.iconOn) {
    onImage = await ctx.loadImage(button.iconOn);
  } else if (button.icon) {
    onImage = await ctx.loadImage(button.icon);
  }

  if (button.iconOff) {
    offImage = await ctx.loadImage(button.iconOff);
  } else if (button.icon) {
    offImage = await ctx.processImageToGrayscale(button.icon);
  }

  // Create feedbacks for state indication
  const entityId = button.entity;

  // Determine entity type for proper feedback type
  const isLight = entityId.startsWith("light.");
  const isSwitch = entityId.startsWith("switch.");

  if (isLight) {
    // ON state feedback
    result.feedbacks.push(
      createLightStateFeedback(ctx.connectionId, entityId, true, onImage),
    );
    // OFF state feedback
    result.feedbacks.push(
      createLightStateFeedback(ctx.connectionId, entityId, false, offImage),
    );
  } else if (isSwitch) {
    // For switches, use switch_state feedback
    result.feedbacks.push(
      createSwitchStateFeedback(ctx.connectionId, entityId, "on", onImage),
    );
    result.feedbacks.push(
      createSwitchStateFeedback(ctx.connectionId, entityId, false, offImage),
    );
  } else {
    // For switches and other entities, use entity_state feedback
    result.feedbacks.push(
      createEntityStateFeedback(ctx.connectionId, entityId, "on", onImage),
    );
    result.feedbacks.push(
      createEntityStateFeedback(ctx.connectionId, entityId, "off", offImage),
    );
  }

  // Create toggle action
  result.steps["0"] = createStep([
    createToggleAction(ctx.connectionId, entityId),
  ]);

  return result;
}

async function compileSceneButton(
  button: SceneButton,
  ctx: CompilerContext,
): Promise<CompanionButton> {
  const result = createEmptyButton();

  applyLabelStyle(button, result);

  if (button.label) {
    result.style.text = button.label;
  }

  if (button.icon) {
    const image = await ctx.loadImage(button.icon);
    if (image) {
      result.style.png64 = image;
    }
  }

  // Create scene/script action
  result.steps["0"] = createStep([
    createScriptAction(ctx.connectionId, button.script),
  ]);

  return result;
}

async function compileNavButton(
  button: NavButton,
  ctx: CompilerContext,
): Promise<CompanionButton> {
  const result = createEmptyButton();

  applyLabelStyle(button, result);

  if (button.label) {
    result.style.text = button.label;
  }

  if (button.icon) {
    const image = await ctx.loadImage(button.icon);
    if (image) {
      result.style.png64 = image;
    }
  }

  // Handle special navigation targets
  if (button.goto === "@home") {
    // Navigate to the panel's home/start page
    result.steps["0"] = createStep([createPageSetAction(ctx.homePageNumber)]);
    return result;
  }

  if (button.goto === "@back") {
    // Navigate back to previous page
    result.steps["0"] = createStep([createPageBackAction()]);
    return result;
  }

  // Resolve target page
  const targetPage = ctx.resolvePageRef(button.goto);
  if (!targetPage) {
    throw new Error(
      `Nav target "${button.goto}" not found in panel "${ctx.panelName}"`,
    );
  }

  // Create page navigation action
  result.steps["0"] = createStep([createPageSetAction(targetPage.pageNumber)]);

  return result;
}

async function compileStatusButton(
  button: StatusButton,
  ctx: CompilerContext,
): Promise<CompanionButton> {
  const result = createEmptyButton();

  applyLabelStyle(button, result);

  // For status buttons, we display the entity value
  // This requires using text expressions
  if (button.format) {
    result.style.text = button.format.replace(
      "{value}",
      `$(${ctx.connectionId}:${button.entity})`,
    );
    result.style.textExpression = true;
  } else {
    result.style.text = `$(${ctx.connectionId}:${button.entity})`;
    result.style.textExpression = true;
  }

  if (button.icon) {
    const image = await ctx.loadImage(button.icon);
    if (image) {
      result.style.png64 = image;
    }
  }

  // Add optional press action
  if (button.onPress) {
    const actions: CompanionAction[] = [];

    if (button.onPress.goto) {
      const targetPage = ctx.resolvePageRef(button.onPress.goto);
      if (targetPage) {
        actions.push(createPageSetAction(targetPage.pageNumber));
      }
    }

    if (button.onPress.service && button.onPress.target) {
      actions.push(
        createServiceCallAction(
          ctx.connectionId,
          button.onPress.service,
          button.onPress.target,
        ),
      );
    }

    if (actions.length > 0) {
      result.steps["0"] = createStep(actions);
    }
  }

  return result;
}

async function compileActionButton(
  button: ActionButton,
  ctx: CompilerContext,
): Promise<CompanionButton> {
  const result = createEmptyButton();

  applyLabelStyle(button, result);

  if (button.label) {
    result.style.text = button.label;
  }

  if (button.icon) {
    const image = await ctx.loadImage(button.icon);
    if (image) {
      result.style.png64 = image;
    }
  }

  // Create service call action
  result.steps["0"] = createStep([
    createServiceCallAction(
      ctx.connectionId,
      button.service,
      button.target,
      button.data,
    ),
  ]);

  return result;
}

// ============================================================================
// Template Resolution
// ============================================================================

/**
 * Resolve a template button by merging template with overrides
 */
function resolveTemplateButton(
  button: TemplateButton,
  ctx: CompilerContext,
): Button {
  const template = ctx.resolveTemplate(button.template);
  if (!template) {
    throw new Error(`Template "${button.template}" not found`);
  }

  // Merge template with button overrides
  const resolved = {
    ...template,
    // Apply overrides from the template button
    ...(button.entity !== undefined && { entity: button.entity }),
    ...(button.script !== undefined && { script: button.script }),
    ...(button.goto !== undefined && { goto: button.goto }),
    ...(button.service !== undefined && { service: button.service }),
    ...(button.target !== undefined && { target: button.target }),
    ...(button.label !== undefined && { label: button.label }),
    ...(button.labelSize !== undefined && { labelSize: button.labelSize }),
    ...(button.labelAlignment !== undefined && {
      labelAlignment: button.labelAlignment,
    }),
    ...(button.icon !== undefined && { icon: button.icon }),
    ...(button.iconOn !== undefined && { iconOn: button.iconOn }),
    ...(button.iconOff !== undefined && { iconOff: button.iconOff }),
    ...(button.format !== undefined && { format: button.format }),
    ...(button.data !== undefined && { data: button.data }),
  };

  return resolved as Button;
}

// ============================================================================
// Main Compiler Entry Point
// ============================================================================

export async function compileButton(
  button: Button,
  ctx: CompilerContext,
): Promise<CompanionButton> {
  // Handle template buttons by resolving them first
  if (button.type === "template") {
    const resolvedButton = resolveTemplateButton(button, ctx);
    return compileButton(resolvedButton, ctx);
  }

  switch (button.type) {
    case "toggle_entity":
      return compileToggleEntityButton(button, ctx);
    case "scene":
      return compileSceneButton(button, ctx);
    case "nav":
      return compileNavButton(button, ctx);
    case "status":
      return compileStatusButton(button, ctx);
    case "action":
      return compileActionButton(button, ctx);
    case "empty":
      return createEmptyButton();
    default:
      // TypeScript exhaustive check
      const _exhaustive: never = button;
      throw new Error(`Unknown button type: ${(_exhaustive as Button).type}`);
  }
}
