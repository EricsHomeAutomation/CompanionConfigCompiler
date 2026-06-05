# YAML Schema Reference

Complete reference for all configuration file structures.

## Table of Contents

- [Project File (companion.yaml)](#project-file)
- [Panel File (\*.panel.yaml)](#panel-file)
- [Single-File Configuration](#single-file-configuration)
- [Connections](#connections)
- [Surfaces](#surfaces)
- [Panels](#panels)
- [Pages](#pages)

---

## Project File

The main entry point for multi-file configurations. References panel files and defines shared resources.

**File:** `companion.yaml`

```yaml
version: 1

connections:
  <connection_name>:
    type: homeassistant-server
    url: <string>
    accessToken: <string>
    ignoreCertificates: <boolean>

templates:
  <template_name>:
    type: <button_type>
    # ... button properties

include:
  - <panel_file.panel.yaml>
  - <another_panel.panel.yaml>

surfaces:
  - id: <surface_id>
    panel: <panel_name>
    brightness: <0-100>
    rotation: <0|90|180|270|surface-90|surface-180|surface-270>

assets:
  iconDir: <path>
```

### Properties

| Property         | Type   | Required | Default   | Description                |
| ---------------- | ------ | -------- | --------- | -------------------------- |
| `version`        | `1`    | ✓        | `1`       | Schema version             |
| `connections`    | object |          |           | Connection definitions     |
| `templates`      | object |          |           | Shared button templates    |
| `include`        | array  | ✓        |           | Panel files to include     |
| `surfaces`       | array  |          |           | Global surface assignments |
| `assets.iconDir` | string |          | `./icons` | Icons directory path       |

---

## Panel File

Defines a single panel with its pages and buttons.

**File:** `<name>.panel.yaml`

```yaml
version: 1
name: <panel_name>

connection:
  name: <connection_name>
  type: homeassistant-server
  url: <string>
  accessToken: <string>
  ignoreCertificates: <boolean>

templates:
  <template_name>:
    type: <button_type>
    # ... button properties

panel:
  start: <page_name>
  gridSize:
    rows: <number>
    columns: <number>
  pages:
    <page_name>:
      <position>:
        type: <button_type>
        # ... button properties

surface:
  id: <surface_id>
  name: <friendly_name>
  brightness: <0-100>
  rotation: <0|90|180|270|surface-90|surface-180|surface-270>

assets:
  iconDir: <path>
```

### Properties

| Property                 | Type   | Required | Default   | Description               |
| ------------------------ | ------ | -------- | --------- | ------------------------- |
| `version`                | `1`    | ✓        | `1`       | Schema version            |
| `name`                   | string | ✓        |           | Panel identifier          |
| `connection`             | object |          |           | Panel-specific connection |
| `templates`              | object |          |           | Panel-specific templates  |
| `panel`                  | object | ✓        |           | Panel definition          |
| `panel.start`            | string | ✓        |           | Default start page name   |
| `panel.gridSize.rows`    | number |          | `2`       | Grid rows                 |
| `panel.gridSize.columns` | number |          | `3`       | Grid columns              |
| `panel.pages`            | object | ✓        |           | Page definitions          |
| `surface`                | object |          |           | Surface assignment        |
| `assets.iconDir`         | string |          | `./icons` | Icons directory path      |

---

## Single-File Configuration

For simple setups, everything can be in one file.

```yaml
version: 1

connections:
  homeassistant:
    type: homeassistant-server
    url: http://10.0.0.120:8123
    accessToken: TOKEN
    ignoreCertificates: true

templates:
  # ... templates

panels:
  <panel_name>:
    start: <page_name>
    gridSize:
      rows: <number>
      columns: <number>
    pages:
      <page_name>:
        <position>:
          type: <button_type>
          # ... button properties

surfaces:
  - id: <surface_id>
    panel: <panel_name>
    brightness: <0-100>
    rotation: <0|90|180|270>

assets:
  iconDir: <path>
```

---

## Connections

Home Assistant server connection configuration.

```yaml
connections:
  homeassistant:
    type: homeassistant-server
    url: http://10.0.0.120:8123
    accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ignoreCertificates: true
```

### Properties

| Property             | Type                   | Required | Default | Description             |
| -------------------- | ---------------------- | -------- | ------- | ----------------------- |
| `type`               | `homeassistant-server` | ✓        |         | Connection type         |
| `url`                | string                 | ✓        |         | Home Assistant URL      |
| `accessToken`        | string                 | ✓        |         | Long-lived access token |
| `ignoreCertificates` | boolean                |          | `true`  | Skip SSL verification   |

### Getting an Access Token

1. In Home Assistant, go to your profile
2. Scroll to "Long-Lived Access Tokens"
3. Click "Create Token"
4. Copy the token (shown only once)

---

## Surfaces

Surface/device definitions link physical devices to panels.

```yaml
surfaces:
  - id: streamdeck:A00DA5421KTHB1
    panel: living_room
    name: Living Room Deck
    brightness: 100
    rotation: 0
```

### Properties

| Property     | Type          | Required | Default | Description               |
| ------------ | ------------- | -------- | ------- | ------------------------- |
| `id`         | string        | ✓        |         | Surface ID from Companion |
| `panel`      | string        | ✓\*      |         | Panel name to assign      |
| `name`       | string        |          |         | Friendly name             |
| `brightness` | number        |          | `100`   | Brightness (0-100)        |
| `rotation`   | number/string |          | `0`     | Rotation value            |

\*Required in project file surfaces; in panel files, the surface is automatically assigned to that panel.

### Finding Surface IDs

1. Open Companion web interface
2. Go to "Surfaces" tab
3. Surface IDs are shown for each connected device

### Rotation Values

| Value         | Description           |
| ------------- | --------------------- |
| `0`           | No rotation           |
| `90`          | 90° clockwise         |
| `180`         | 180° rotation         |
| `270`         | 270° clockwise        |
| `surface-90`  | Surface-relative 90°  |
| `surface-180` | Surface-relative 180° |
| `surface-270` | Surface-relative 270° |

---

## Panels

Panel definitions contain pages and their button layouts.

```yaml
panels:
  living_room:
    start: home
    gridSize:
      rows: 2
      columns: 3
    pages:
      home:
        1:
          type: toggle_entity
          entity: light.living_room
        # ... more buttons
      settings:
        # ... buttons
```

### Properties

| Property           | Type   | Required | Default | Description        |
| ------------------ | ------ | -------- | ------- | ------------------ |
| `start`            | string | ✓        |         | Default start page |
| `gridSize.rows`    | number |          | `2`     | Number of rows     |
| `gridSize.columns` | number |          | `3`     | Number of columns  |
| `pages`            | object | ✓        |         | Page definitions   |

### Common Grid Sizes

| Device           | Rows | Columns | Total Buttons |
| ---------------- | ---- | ------- | ------------- |
| Stream Deck Mini | 2    | 3       | 6             |
| Stream Deck MK.2 | 3    | 5       | 15            |
| Stream Deck XL   | 4    | 8       | 32            |

---

## Pages

Pages define button layouts within a panel.

```yaml
pages:
  home:
    1:
      type: toggle_entity
      entity: light.living_room
      label: Living
    2:
      type: status
      entity: sensor.temperature
    3:
      type: empty
    4:
      type: scene
      script: script.movie_mode
      label: Movie
    5:
      type: nav
      goto: "@back"
      label: Back
    6:
      type: nav
      goto: settings
      label: Settings
```

### Button Positions

Buttons are numbered 1 to N (where N = rows × columns), row by row from top-left:

**2×3 Grid:**

```
┌───┬───┬───┐
│ 1 │ 2 │ 3 │
├───┼───┼───┤
│ 4 │ 5 │ 6 │
└───┴───┴───┘
```

**3×5 Grid:**

```
┌───┬───┬───┬───┬───┐
│ 1 │ 2 │ 3 │ 4 │ 5 │
├───┼───┼───┼───┼───┤
│ 6 │ 7 │ 8 │ 9 │ 10│
├───┼───┼───┼───┼───┤
│ 11│ 12│ 13│ 14│ 15│
└───┴───┴───┴───┴───┘
```

### Sparse Definitions

You don't need to define every button position. Undefined positions are treated as empty:

```yaml
pages:
  home:
    1:
      type: toggle_entity
      entity: light.main
    # positions 2-5 are implicitly empty
    6:
      type: nav
      goto: "@home"
```
