import { describe, it, expect } from "vitest";
import * as root from "../src/index";
import * as parser from "../src/parser";
import * as allocator from "../src/allocator";
import * as compiler from "../src/compiler";
import * as emitter from "../src/emitter";
import * as utils from "../src/utils";

describe("Barrel exports", () => {
  it("exports key APIs from root index", () => {
    expect(typeof root.parseProjectFile).toBe("function");
    expect(typeof root.allocatePages).toBe("function");
    expect(typeof root.compileButton).toBe("function");
    expect(typeof root.emit).toBe("function");
    expect(typeof root.createImageLoader).toBe("function");
  });

  it("exports submodule APIs", () => {
    expect(typeof parser.loadProject).toBe("function");
    expect(typeof allocator.validatePageReferences).toBe("function");
    expect(typeof compiler.compileButton).toBe("function");
    expect(typeof emitter.serializeConfig).toBe("function");
    expect(typeof utils.mergeProject).toBe("function");
  });
});
