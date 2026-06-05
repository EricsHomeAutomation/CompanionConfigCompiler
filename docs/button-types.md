# Button Types Reference

This document describes all available button types and their properties.

## Table of Contents

- [toggle_entity](#toggle_entity)
- [scene](#scene)
- [action](#action)
- [status](#status)
- [nav](#nav)
- [empty](#empty)
- [template](#template)

---

## toggle_entity

Toggles a Home Assistant entity on/off. Commonly used for lights and switches.

### Properties

| Property  | Type              | Required | Description                                           |
| --------- | ----------------- | -------- | ----------------------------------------------------- |
| `type`    | `"toggle_entity"` | ✓        | Button type identifier                                |
| `entity`  | string            | ✓        | Home Assistant entity ID (e.g., `light.patio`)        |
| `label`   | string            |          | Optional text label displayed on button               |
| `icon`    | string            |          | Path to icon image (relative to icons directory)      |
| `iconOn`  | string            |          | Icon to display when entity is ON (overrides `icon`)  |
| `iconOff` | string            |          | Icon to display when entity is OFF (overrides `icon`) |

### Example

```yaml
1:
  type: toggle_entity
  entity: light.living_room
  label: Living Room
  icon: light.png

2:
  type: toggle_entity
  entity: light.bedroom
  iconOn: bulb-on.png
  iconOff: bulb-off.png
```

### Behavior

- **Press**: Toggles the entity between on and off states
- **Feedback**: Button displays `iconOn` when entity is on, `iconOff` when off

---

## scene

Calls a Home Assistant script or scene.

### Properties

| Property | Type      | Required | Description                                                   |
| -------- | --------- | -------- | ------------------------------------------------------------- |
| `type`   | `"scene"` | ✓        | Button type identifier                                        |
| `script` | string    | ✓        | Home Assistant script or scene ID (e.g., `script.movie_mode`) |
| `label`  | string    |          | Optional text label                                           |
| `icon`   | string    |          | Path to icon image                                            |

### Example

```yaml
1:
  type: scene
  script: script.welcome_home
  label: Welcome
  icon: home.png

2:
  type: scene
  script: scene.movie_night
  label: Movie
  icon: movie.png
```

### Behavior

- **Press**: Activates the script or scene
- **Feedback**: None (one-shot action)

---

## action

Calls any Home Assistant service with optional data.

### Properties

| Property  | Type       | Required | Description                                               |
| --------- | ---------- | -------- | --------------------------------------------------------- |
| `type`    | `"action"` | ✓        | Button type identifier                                    |
| `service` | string     | ✓        | Home Assistant service (e.g., `media_player.media_pause`) |
| `target`  | string     | ✓        | Target entity ID                                          |
| `label`   | string     |          | Optional text label                                       |
| `icon`    | string     |          | Path to icon image                                        |
| `data`    | object     |          | Additional service data as key-value pairs                |

### Example

```yaml
1:
  type: action
  service: media_player.media_pause
  target: media_player.living_room
  label: Pause
  icon: pause.png

2:
  type: action
  service: climate.set_temperature
  target: climate.thermostat
  label: Set 72°
  icon: temp.png
  data:
    temperature: 72

3:
  type: action
  service: light.turn_on
  target: light.bedroom
  label: Dim 50%
  data:
    brightness_pct: 50
```

### Behavior

- **Press**: Calls the specified service with target and data
- **Feedback**: None (one-shot action)

---

## status

Displays an entity's state value (read-only by default).

### Properties

| Property          | Type       | Required | Description                         |
| ----------------- | ---------- | -------- | ----------------------------------- |
| `type`            | `"status"` | ✓        | Button type identifier              |
| `entity`          | string     | ✓        | Home Assistant entity ID            |
| `label`           | string     |          | Optional text label                 |
| `icon`            | string     |          | Path to icon image                  |
| `format`          | string     |          | Display format (e.g., `"{value}°"`) |
| `onPress`         | object     |          | Optional action when pressed        |
| `onPress.goto`    | string     |          | Navigate to page on press           |
| `onPress.service` | string     |          | Call service on press               |
| `onPress.target`  | string     |          | Target entity for service           |

### Example

```yaml
1:
  type: status
  entity: sensor.temperature
  label: Temp

2:
  type: status
  entity: sensor.humidity
  format: "{value}%"
  icon: humidity.png

3:
  type: status
  entity: weather.home
  label: Weather
  onPress:
    goto: weather_details
```

### Behavior

- **Display**: Shows the entity's current state value
- **Press**: Executes `onPress` action if defined, otherwise no action

---

## nav

Navigates to another page within the panel.

### Properties

| Property | Type    | Required | Description                           |
| -------- | ------- | -------- | ------------------------------------- |
| `type`   | `"nav"` | ✓        | Button type identifier                |
| `goto`   | string  | ✓        | Target page name or special reference |
| `label`  | string  |          | Optional text label                   |
| `icon`   | string  |          | Path to icon image                    |

### Special `goto` Values

| Value       | Description                        |
| ----------- | ---------------------------------- |
| `page_name` | Navigate to the named page         |
| `@home`     | Navigate to the panel's start page |
| `@back`     | Navigate to the previous page      |

### Example

```yaml
# Navigate to a named page
1:
  type: nav
  goto: settings
  label: Settings
  icon: gear.png

# Navigate back
5:
  type: nav
  goto: "@back"
  label: Back
  icon: back.png

# Navigate home
6:
  type: nav
  goto: "@home"
  label: Home
  icon: home.png
```

### Behavior

- **Press**: Changes to the specified page

---

## empty

A blank button with no action or display.

### Properties

| Property | Type      | Required | Description            |
| -------- | --------- | -------- | ---------------------- |
| `type`   | `"empty"` | ✓        | Button type identifier |

### Example

```yaml
3:
  type: empty

4:
  type: empty
```

### Behavior

- **Display**: Blank/empty button
- **Press**: No action

---

## template

Uses a predefined template with optional property overrides.

### Properties

| Property   | Type         | Required | Description                 |
| ---------- | ------------ | -------- | --------------------------- |
| `type`     | `"template"` | ✓        | Button type identifier      |
| `template` | string       | ✓        | Name of the template to use |
| `entity`   | string       |          | Override template's entity  |
| `script`   | string       |          | Override template's script  |
| `goto`     | string       |          | Override template's goto    |
| `service`  | string       |          | Override template's service |
| `target`   | string       |          | Override template's target  |
| `label`    | string       |          | Override template's label   |
| `icon`     | string       |          | Override template's icon    |
| `iconOn`   | string       |          | Override template's iconOn  |
| `iconOff`  | string       |          | Override template's iconOff |
| `format`   | string       |          | Override template's format  |
| `data`     | object       |          | Override template's data    |

### Example

**Define template in companion.yaml:**

```yaml
templates:
  light_toggle:
    type: toggle_entity
    iconOn: bulb-on.png
    iconOff: bulb-off.png

  home_button:
    type: nav
    goto: "@home"
    label: Home
    icon: home.png
```

**Use template in panel:**

```yaml
1:
  type: template
  template: light_toggle
  entity: light.living_room
  label: Living

2:
  type: template
  template: light_toggle
  entity: light.bedroom
  label: Bedroom

6:
  type: template
  template: home_button
```

### Behavior

- Inherits all properties from the referenced template
- Specified properties override template defaults
- Final behavior depends on the template's base type
