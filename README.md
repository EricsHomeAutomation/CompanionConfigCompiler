# Companion Config Compiler

Compiles folder-based Home Assistant Stream Deck projects into Bitfocus Companion `.companionconfig` files.

## Install

```bash
npm install
npm run build
```

Run commands through npm:

```bash
npm run start -- <command> [args]
```

Or run compiled CLI directly:

```bash
node dist/cli.js <command> [args]
```

## Commands

### init

Initialize a project folder with:

- `companion.yaml`
- `main.panel.yaml`
- `secrets.yaml`
- `icons/`

Usage:

```bash
npm run start -- init <dir> [--force]
```

Options:

- `--force`
  Overwrite existing `companion.yaml`, `main.panel.yaml`, and `secrets.yaml`.

Example:

```bash
npm run start -- init ./my-deck
```

---

### validate

Validate a folder project.

This command:

- auto-detects `companion.yaml` / `companion.yml` / `companion.json` in the folder
- strictly loads only panel files listed in `include`
- fails if any included file is missing
- checks page reference validity

Usage:

```bash
npm run start -- validate <dir>
```

Example:

```bash
npm run start -- validate ./examples/home
```

---

### build

Build a folder project into a Companion config file.

This command:

- uses the same strict include behavior as `validate`
- fails when included files are missing
- compiles pages/surfaces/connections into Companion JSON
- writes output to `output.companionconfig` in the same folder by default

Usage:

```bash
npm run start -- build <dir> [options]
```

Options:

- `-o, --output <file>`
  Output file path or filename.
  If relative, it is resolved inside `<dir>`.
  Default: `<dir>/output.companionconfig`.

- `--icons <dir>`
  Icons directory relative to `<dir>`.
  Default: `./icons`.

- `--companion-build <version>`
  Companion build string embedded in output.
  Default: `4.2.5+8815-stable-8821dfa519`.

- `--pretty`
  Pretty-print JSON output (default).

- `--no-pretty`
  Minified JSON output.

- `--strict`
  Fail when warnings occur for missing icons.

Examples:

```bash
# Default output in folder
npm run start -- build ./examples/home

# Custom output filename in same folder
npm run start -- build ./examples/home -o hot-tub.companionconfig

# Absolute output path
npm run start -- build ./examples/home -o /tmp/home.companionconfig

# Strict icon checking
npm run start -- build ./examples/home --strict
```

## Project format

Minimal `companion.yaml`:

```yaml
version: 1

connections:
  homeassistant-server:
    type: homeassistant-server
    url: http://10.0.0.120:8123
    accessToken: !secret homeassistant_access_token
    ignoreCertificates: true

templates:
  next_button:
    type: nav
    label: ▶

include:
  - main.panel.yaml
```

Minimal `secrets.yaml`:

```yaml
homeassistant_access_token: YOUR_LONG_LIVED_ACCESS_TOKEN
```

You can use `!secret keyName` in YAML project/panel files. Secret values are loaded from `secrets.yaml` in the project folder.

Minimal `main.panel.yaml`:

```yaml
version: 1
name: main

surface:
  id: streamdeck:YOUR_SERIAL
  name: Main Panel
  brightness: 100
  rotation: 0

panel:
  start: home
  gridSize:
    rows: 2
    columns: 3
  pages:
    home:
      1:
        type: toggle_entity
        entity: light.example
        label: Light
      2:
        type: empty
      3:
        type: empty
      4:
        type: empty
      5:
        type: empty
      6:
        type: empty
```

## Notes

- `validate` and `build` are strict about `include` paths.
- If a file listed in `include` does not exist, command exits with error.
- Missing icon files are warnings unless `--strict` is used.
