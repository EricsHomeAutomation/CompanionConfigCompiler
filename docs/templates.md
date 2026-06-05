# Templates

Templates allow you to define reusable button configurations that can be referenced across your panels.

## Defining Templates

Templates are defined in the `templates` section of your project file (`companion.yaml`) or within individual panel files.

### In Project File (Shared)

Templates defined in `companion.yaml` are available to all included panel files:

```yaml
# companion.yaml
version: 1

connections:
  homeassistant:
    type: homeassistant-server
    url: http://10.0.0.120:8123
    accessToken: TOKEN

templates:
  home_button:
    type: nav
    goto: "@home"
    label: Home
    icon: home.png

  back_button:
    type: nav
    goto: "@back"
    label: Back
    icon: back.png

  standard_light:
    type: toggle_entity
    iconOn: bulb-on.png
    iconOff: bulb-off.png

include:
  - living-room.panel.yaml
  - bedroom.panel.yaml
```

### In Panel File (Local)

Templates defined in a panel file are only available within that panel:

```yaml
# bedroom.panel.yaml
version: 1
name: bedroom

templates:
  bedroom_scene:
    type: scene
    icon: bed.png

panel:
  start: main
  pages:
    main:
      1:
        type: template
        template: bedroom_scene
        script: script.bedtime
        label: Bedtime
```

## Using Templates

Reference a template using the `template` button type:

```yaml
pages:
  home:
    1:
      type: template
      template: standard_light
      entity: light.living_room
      label: Living Room

    2:
      type: template
      template: standard_light
      entity: light.kitchen
      label: Kitchen

    6:
      type: template
      template: home_button
```

## Overriding Properties

Any property can be overridden when using a template:

```yaml
templates:
  media_control:
    type: action
    service: media_player.media_play
    icon: play.png

pages:
  media:
    1:
      type: template
      template: media_control
      target: media_player.living_room
      # Inherits: service, icon

    2:
      type: template
      template: media_control
      target: media_player.bedroom
      service: media_player.media_pause # Override service
      icon: pause.png # Override icon
      label: Pause Bedroom
```

## Template Properties

Templates support all properties of the button types they define:

| Property  | Applicable Types      | Description                     |
| --------- | --------------------- | ------------------------------- |
| `type`    | All                   | **Required** - Base button type |
| `entity`  | toggle_entity, status | Home Assistant entity ID        |
| `script`  | scene                 | Script or scene ID              |
| `goto`    | nav                   | Target page name                |
| `service` | action                | Service to call                 |
| `target`  | action                | Target entity for service       |
| `label`   | All                   | Button text label               |
| `icon`    | All                   | Default icon path               |
| `iconOn`  | toggle_entity         | Icon when entity is on          |
| `iconOff` | toggle_entity         | Icon when entity is off         |
| `format`  | status                | Value display format            |
| `data`    | action                | Service call data               |
| `onPress` | status                | Action when pressed             |

## Common Template Patterns

### Navigation Buttons

```yaml
templates:
  home_button:
    type: nav
    goto: "@home"
    label: ⌂
    icon: home.png

  back_button:
    type: nav
    goto: "@back"
    label: ◀
    icon: back.png

  next_page:
    type: nav
    label: ▶
    icon: next.png
```

### Light Controls

```yaml
templates:
  light_toggle:
    type: toggle_entity
    iconOn: light-on.png
    iconOff: light-off.png

  light_bright:
    type: action
    service: light.turn_on
    data:
      brightness_pct: 100
    icon: bright.png

  light_dim:
    type: action
    service: light.turn_on
    data:
      brightness_pct: 25
    icon: dim.png
```

### Media Controls

```yaml
templates:
  media_play:
    type: action
    service: media_player.media_play
    icon: play.png
    label: Play

  media_pause:
    type: action
    service: media_player.media_pause
    icon: pause.png
    label: Pause

  media_next:
    type: action
    service: media_player.media_next_track
    icon: next.png

  media_prev:
    type: action
    service: media_player.media_previous_track
    icon: prev.png

  volume_up:
    type: action
    service: media_player.volume_up
    icon: vol-up.png

  volume_down:
    type: action
    service: media_player.volume_down
    icon: vol-down.png
```

### Climate Controls

```yaml
templates:
  temp_up:
    type: action
    service: climate.set_temperature
    icon: temp-up.png
    data:
      temperature: "{{ state_attr('climate.thermostat', 'temperature') + 1 }}"

  temp_down:
    type: action
    service: climate.set_temperature
    icon: temp-down.png

  hvac_off:
    type: action
    service: climate.set_hvac_mode
    data:
      hvac_mode: "off"
    icon: hvac-off.png
```

## Template Inheritance

When a template is used, properties are merged in this order:

1. **Template defaults** - Base properties from the template definition
2. **Usage overrides** - Properties specified when using the template

```yaml
templates:
  base_light:
    type: toggle_entity
    iconOn: light-on.png
    iconOff: light-off.png
    label: Light

pages:
  home:
    1:
      type: template
      template: base_light
      entity: light.patio
      label: Patio # Overrides "Light"
      # iconOn and iconOff inherited from template
```

## Best Practices

1. **Use descriptive names** - `living_room_light` is better than `light1`
2. **Define common patterns** - Navigation buttons, media controls, etc.
3. **Keep templates simple** - One purpose per template
4. **Document your templates** - Add comments explaining usage
5. **Use shared templates** - Put frequently used templates in `companion.yaml`
