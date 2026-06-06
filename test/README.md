# Test Guide

This folder contains all automated tests for the companion-config-compiler project.

## How tests are organized

- Unit-focused files use the pattern module.test.ts.
- Runtime behavior files use the pattern module.runtime.test.ts.
- Helper-specific files use the pattern module.helpers.test.ts.
- Condition-specific runtime files use module.condition.runtime.test.ts.

Examples from this repo:

- cli.test.ts: command registration and core command behavior checks.
- cli.runtime.test.ts: real command execution against temporary project folders.
- cli.branches.runtime.test.ts: targeted branch and error-path coverage for CLI.
- allocator.helpers.test.ts: helper-level allocator checks.
- imageLoader.no-sharp.runtime.test.ts: image behavior when sharp is unavailable.

## Naming scheme

Use the shortest filename that clearly communicates scope:

- module.test.ts
- module.runtime.test.ts
- module.helpers.test.ts
- module.condition.runtime.test.ts

Keep condition names explicit and environment-oriented, for example no-sharp.

## Test setup style

- Use temporary directories created in beforeEach.
- Clean up with afterEach using recursive remove.
- Prefer real inputs and runtime execution for branch coverage.
- Mock only when required to force hard-to-reach conditions.
- Do not weaken type safety in tests.

## Running tests

- Run all tests: npm test -- --run
- Run coverage: npm run test:coverage

## Authoring tips

- Add tests in the most specific existing file before creating a new one.
- Create a new test file when scope or condition is distinct.
- Keep fixture YAML and JSON minimal, valid, and easy to read.
- Assert both success paths and failure paths for critical modules.
