# Header Custom Entities - Configuration Guide

This guide shows how to add custom entity icons to the TileBoard header with dynamic states and styling.

## Features

- **Multiple Icons**: Add 5-7 (or more) custom entity icons in the header
- **Dynamic Text**: Show optional text next to icons (with configurable position)
- **Conditional Display**: Show/hide icons based on entity state
- **Dynamic Styling**: Change icon color, size based on entity state
- **Flexible Positioning**: Place icons in center, left, or right sections
- **Responsive**: Icons don't increase header height

## Configuration Structure

Add custom entity items to the `header` object in your `config.js`:

```javascript
header: {
   styles: {
      margin: '0px 15px 0',
      fontSize: '16px',
   },
   left: [
      {
         type: HEADER_ITEMS.DATETIME,
         dateFormat: 'EEEE, dd LLLL',
      },
   ],
   center: [  // NEW: Center section for custom entities
      // Add your custom entity icons here
   ],
   right: [
      {
         type: HEADER_ITEMS.WEATHER,
         // ... your weather config
      },
   ],
}
```

## Configuration Options

Each custom entity item supports the following options:

| Option | Type | Description |
|--------|------|-------------|
| `type` | String | Must be `HEADER_ITEMS.CUSTOM_ENTITY` |
| `id` | String | Entity ID from Home Assistant |
| `icon` | String/Function | Icon class (e.g., `'mdi-home'`) or function returning icon |
| `state` | String/Function/Boolean | Text to display or function returning text. Set to `false` to hide text |
| `textPosition` | String | `'left'` or `'right'` (default: right) - position of text relative to icon |
| `iconSize` | String/Function | CSS font-size for icon (e.g., `'1.5em'`, `'24px'`) |
| `iconColor` | String/Function | CSS color for icon (e.g., `'#ff0000'`, function returning color) |
| `customStyles` | Function | Function returning custom CSS styles object |
| `hidden` | Function | Function returning boolean - true to hide the item |
| `filter` | Function | Function to transform the state text |

## Examples

### Example 1: Simple Icon with Text

Display a washing machine icon with status text:

```javascript
center: [
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'sensor.washing_machine_status',
      icon: 'mdi-washing-machine',
      state: '&sensor.washing_machine_status.state',  // Show entity state
      textPosition: 'right',
   },
]
```

### Example 2: Icon Only (No Text)

Display just a notification bell icon:

```javascript
center: [
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'sensor.unread_notifications',
      icon: 'mdi-bell',
      state: false,  // No text
   },
]
```

### Example 3: Dynamic Icon Color Based on State

Change icon color based on entity state:

```javascript
center: [
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'binary_sensor.front_door',
      icon: 'mdi-door',
      state: false,
      iconColor: function(item, entity) {
         return entity.state === 'on' ? '#ff0000' : '#00ff00';
      },
   },
]
```

### Example 4: Conditional Display

Only show icon when certain condition is met:

```javascript
center: [
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'sensor.garbage_collection',
      icon: 'mdi-trash-can',
      state: 'Tomorrow',
      hidden: function(item, entity) {
         // Hide if no collection tomorrow
         return entity.state !== 'tomorrow';
      },
   },
]
```

### Example 5: Custom State Text with Formatting

Display relative time since last motion:

```javascript
center: [
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'binary_sensor.motion_sensor',
      icon: 'mdi-motion-sensor',
      state: function(item, entity) {
         if (entity.state === 'on') {
            return 'Now';
         }
         const lastChanged = new Date(entity.last_changed);
         return window.relativeTimeSinceDate(lastChanged);
      },
      iconColor: function(item, entity) {
         return entity.state === 'on' ? '#ffff00' : '#888888';
      },
   },
]
```

### Example 6: Multiple Icons in Center Section

Display 5-7 status icons in the center:

```javascript
center: [
   // 1. Washing Machine
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'sensor.washing_machine_status',
      icon: function(item, entity) {
         const states = {
            'running': 'mdi-washing-machine',
            'finished': 'mdi-check-circle',
            'idle': 'mdi-washing-machine-off',
         };
         return states[entity.state] || 'mdi-washing-machine';
      },
      state: false,
      iconColor: function(item, entity) {
         const colors = {
            'running': '#4CAF50',
            'finished': '#2196F3',
            'idle': '#888888',
         };
         return colors[entity.state] || '#888888';
      },
      hidden: function(item, entity) {
         return entity.state === 'idle';
      },
   },

   // 2. Front Door
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'binary_sensor.front_door',
      icon: 'mdi-door',
      state: false,
      iconColor: function(item, entity) {
         return entity.state === 'on' ? '#ff0000' : '#00ff00';
      },
   },

   // 3. Motion Detection
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'binary_sensor.motion',
      icon: 'mdi-motion-sensor',
      state: function(item, entity) {
         if (entity.state === 'on') return 'Now';
         const lastChanged = new Date(entity.last_changed);
         return window.relativeTimeSinceDate(lastChanged);
      },
      textPosition: 'right',
      iconColor: function(item, entity) {
         return entity.state === 'on' ? '#ffff00' : '#888888';
      },
      iconSize: '1.3em',
   },

   // 4. Garbage Collection
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'sensor.garbage_collection',
      icon: 'mdi-trash-can',
      state: false,
      iconColor: function(item, entity) {
         const colors = {
            'paper': '#0000ff',
            'glass': '#00ff00',
            'mixed': '#000000',
            'bio': '#8B4513',
         };
         return colors[entity.state] || '#888888';
      },
      hidden: function(item, entity) {
         // Only show if collection is today or tomorrow
         const attr = entity.attributes || {};
         return !attr.is_today && !attr.is_tomorrow;
      },
   },

   // 5. Package Delivery
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'sensor.packages',
      icon: 'mdi-package-variant',
      state: function(item, entity) {
         const count = parseInt(entity.state) || 0;
         return count > 0 ? count.toString() : null;
      },
      iconColor: '#FF9800',
      hidden: function(item, entity) {
         return parseInt(entity.state) === 0;
      },
   },

   // 6. Security Alarm
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'alarm_control_panel.home',
      icon: function(item, entity) {
         const icons = {
            'armed_away': 'mdi-shield-lock',
            'armed_home': 'mdi-shield-home',
            'disarmed': 'mdi-shield-off',
            'pending': 'mdi-shield-alert',
         };
         return icons[entity.state] || 'mdi-shield';
      },
      state: false,
      iconColor: function(item, entity) {
         const colors = {
            'armed_away': '#ff0000',
            'armed_home': '#ff9800',
            'disarmed': '#4caf50',
            'pending': '#ffeb3b',
         };
         return colors[entity.state] || '#888888';
      },
   },

   // 7. Internet Status
   {
      type: HEADER_ITEMS.CUSTOM_ENTITY,
      id: 'binary_sensor.internet',
      icon: 'mdi-wifi',
      state: function(item, entity) {
         const speedMbps = entity.attributes?.download_speed_mbps;
         return speedMbps ? Math.round(speedMbps) + ' Mbps' : '';
      },
      textPosition: 'right',
      iconColor: function(item, entity) {
         return entity.state === 'on' ? '#4CAF50' : '#f44336';
      },
      hidden: function(item, entity) {
         return entity.state === 'on';  // Only show when offline
      },
   },
]
```

## Advanced Examples

### Example 7: Custom Styles with Animations

Add pulsing animation to important alerts:

```javascript
{
   type: HEADER_ITEMS.CUSTOM_ENTITY,
   id: 'binary_sensor.smoke_detector',
   icon: 'mdi-smoke-detector',
   state: 'ALERT',
   customStyles: function(item, entity) {
      if (entity.state === 'on') {
         return {
            color: '#ff0000',
            animation: 'pulse 1s infinite',
         };
      }
      return { color: '#888888' };
   },
   hidden: function(item, entity) {
      return entity.state !== 'on';
   },
}
```

### Example 8: Multiple Icon States

Switch between different icons based on state:

```javascript
{
   type: HEADER_ITEMS.CUSTOM_ENTITY,
   id: 'sensor.weather_alert',
   icon: function(item, entity) {
      const alerts = {
         'storm': 'mdi-weather-lightning',
         'rain': 'mdi-weather-rainy',
         'snow': 'mdi-weather-snowy',
         'heat': 'mdi-weather-sunny-alert',
         'none': 'mdi-check',
      };
      return alerts[entity.state] || 'mdi-alert';
   },
   state: function(item, entity) {
      return entity.state !== 'none' ? entity.state.toUpperCase() : null;
   },
   iconColor: function(item, entity) {
      const colors = {
         'storm': '#ff0000',
         'rain': '#2196f3',
         'snow': '#e0e0e0',
         'heat': '#ff9800',
         'none': '#4caf50',
      };
      return colors[entity.state] || '#888888';
   },
   hidden: function(item, entity) {
      return entity.state === 'none';
   },
}
```

### Example 9: Using Entity Attributes

Access entity attributes for more complex logic:

```javascript
{
   type: HEADER_ITEMS.CUSTOM_ENTITY,
   id: 'sensor.battery_status',
   icon: function(item, entity) {
      const level = parseInt(entity.state) || 0;
      if (level > 80) return 'mdi-battery';
      if (level > 60) return 'mdi-battery-80';
      if (level > 40) return 'mdi-battery-60';
      if (level > 20) return 'mdi-battery-40';
      return 'mdi-battery-20';
   },
   state: function(item, entity) {
      return entity.state + '%';
   },
   iconColor: function(item, entity) {
      const level = parseInt(entity.state) || 0;
      if (level < 20) return '#ff0000';
      if (level < 40) return '#ff9800';
      return '#4caf50';
   },
   hidden: function(item, entity) {
      const isCharging = entity.attributes?.is_charging;
      return isCharging === true;  // Hide when charging
   },
}
```

## Tips

1. **Keep it minimal**: 5-7 icons work best to avoid cluttering the header
2. **Use hidden wisely**: Only show icons when they need attention
3. **Color coding**: Use consistent colors across your dashboard
4. **Icon size**: Default size (1.5em) works well, adjust as needed
5. **Text position**: Use `textPosition: 'left'` for RTL languages or preference

## Positioning

You can place custom entities in three sections:

```javascript
header: {
   left: [/* Left-aligned items */],
   center: [/* Center-aligned items (recommended for custom entities) */],
   right: [/* Right-aligned items */],
}
```

The center section is recommended for custom entity icons as it provides better visual balance without interfering with the existing time/date and weather displays.
