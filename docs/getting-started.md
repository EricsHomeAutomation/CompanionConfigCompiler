# Companion Config Compiler - Getting Started

A YAML-based configuration compiler for Bitfocus Companion, designed to simplify Stream Deck configuration for Home Assistant integrations.

## Overview

The Companion Config Compiler (`ccc`) transforms human-readable YAML configuration files into Companion's native `.companionconfig` JSON format. This allows you to:

- Define button layouts declaratively
- Use reusable templates for common button patterns
- Split configurations across multiple files
- Version control your Stream Deck configurations

## Installation

```bash
cd companion-config-compiler
npm install
npm run build
npm link  # Makes 'ccc' available globally
```

## Quick Start

### 1. Create a Project Structure

```
my-project/
├── companion.yaml      # Main project file
├── living-room.panel.yaml
├── bedroom.panel.yaml
└── icons/
    ├── light.png
    └── home.png
```

### 2. Create the Main Project File

**companion.yaml**

```yaml
version: 1

connections:
  homeassistant:
    type: homeassistant-server
    url: http://10.0.0.120:8123
    accessToken: YOUR_LONG_LIVED_TOKEN
    ignoreCertificates: true

templates:
  home_button:
    type: nav
    goto: "@home"
    label: Home

include:
  - living-room.panel.yaml

assets:
  iconDir: ./icons
```

### 3. Create a Panel File

**living-room.panel.yaml**

```yaml
version: 1
name: living_room

panel:
  start: main
  gridSize:
    rows: 2
    columns: 3
  pages:
    main:
      1:
        type: toggle_entity
        entity: light.living_room
        label: Light
        icon: light.png
      2:
        type: status
        entity: sensor.temperature
        label: Temp
      3:
        type: empty
      4:
        type: empty
      5:
        type: template
        template: home_button
      6:
        type: nav
        goto: scenes
        label: Scenes

    scenes:
      1:
        type: scene
        script: script.movie_mode
        label: Movie
      6:
        type: template
        template: home_button

surface:
  id: streamdeck:YOUR_SERIAL
  brightness: 100
  rotation: 0
```

### 4. Build the Configuration

```bash
ccc build companion.yaml -o output.companionconfig
```

### 5. Import into Companion

In Companion's web interface, go to **Import/Export** and import `output.companionconfig`.

## Project Structure

### Single-File Configuration

For simple setups, you can use a single file containing everything:

```yaml
version: 1

connections:
  homeassistant:
    type: homeassistant-server
    url: http://10.0.0.120:8123
    accessToken: TOKEN
    ignoreCertificates: true

panels:
  my_panel:
    start: home
    gridSize:
      rows: 2
      columns: 3
    pages:
      home:
        1:
          type: toggle_entity
          entity: light.living_room

surfaces:
  - id: streamdeck:SERIAL
    panel: my_panel
    brightness: 100
```

### Multi-File Configuration

For larger setups, split into a main project file and panel files:

**companion.yaml** (project file)

```yaml
version: 1

connections:
  homeassistant:
    type: homeassistant-server
    url: http://10.0.0.120:8123
    accessToken: TOKEN

templates:
  # Shared templates here

include:
  - panel1.panel.yaml
  - panel2.panel.yaml
```

**panel1.panel.yaml**

```yaml
version: 1
name: panel1

panel:
  start: home
  pages:
    home:
      # buttons...

surface:
  id: streamdeck:SERIAL1
```

## Button Positions

Buttons are numbered 1-N based on grid size, row by row:

**3x2 Grid (Stream Deck Mini)**

```
┌───┬───┬───┐
│ 1 │ 2 │ 3 │
├───┼───┼───┤
│ 4 │ 5 │ 6 │
└───┴───┴───┘
```

**5x3 Grid (Stream Deck MK.2)**

```
┌───┬───┬───┬───┬───┐
│ 1 │ 2 │ 3 │ 4 │ 5 │
├───┼───┼───┼───┼───┤
│ 6 │ 7 │ 8 │ 9 │ 10│
├───┼───┼───┼───┼───┤
│ 11│ 12│ 13│ 14│ 15│
└───┴───┴───┴───┴───┘
```

## CLI Commands

### Build

```bash
# Build from project file
ccc build companion.yaml -o output.companionconfig

# With strict icon checking
ccc build companion.yaml -o output.companionconfig --strict

# Custom icons directory
ccc build companion.yaml -o output.companionconfig --icons ./my-icons
```

### Validate

```bash
ccc validate companion.yaml
```

## Page Navigation

Use the `nav` button type to navigate between pages:

```yaml
# Go to a specific page
6:
  type: nav
  goto: settings
  label: Settings

# Go back to previous page
5:
  type: nav
  goto: "@back"
  label: Back

# Go to home/start page
4:
  type: nav
  goto: "@home"
  label: Home
```

## Icons

Icons are loaded from the `iconDir` (default: `./icons`). Reference them by filename:

```yaml
1:
  type: toggle_entity
  entity: light.patio
  icon: light.png # loads ./icons/light.png
  iconOn: light-on.png # optional: different icon when on
  iconOff: light-off.png # optional: different icon when off
```

## Next Steps

- See [Button Types Reference](./button-types.md) for all button types and properties
- See [Templates](./templates.md) for reusable button patterns
