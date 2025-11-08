# TileBoard Refactoring Guide

This guide documents all the refactored features extracted from the original config.js into proper TileBoard services and utilities.

## Table of Contents

1. [Services](#services)
   - [NotificationManager](#notificationmanager)
   - [ErrorLogger](#errorlogger)
   - [LocationDetector](#locationdetector)
2. [Tile Helpers](#tile-helpers)
   - [Climate Helpers](#climate-helpers)
   - [Light Track Helpers](#light-track-helpers)
   - [PIN Protection](#pin-protection)
3. [Utility Functions](#utility-functions)
4. [Power Usage Indicator](#power-usage-indicator)
5. [Configuration](#configuration)

---

## Services

### NotificationManager

Unified iframe notification system supporting full-screen and corner notifications.

**Features:**
- Full-screen overlay notifications
- Corner stacked notifications (bottom-left)
- Auto-close with configurable duration
- Duplicate prevention (O(1) performance)
- Auto-cleanup on close

**Initialization:**

```javascript
CONFIG.features = {
   notifications: {
      enabled: true,
      defaultFullScreenDuration: 5000,  // 5 seconds
      defaultCornerDuration: 10000,     // 10 seconds
      maxCornerNotifications: 3,
   }
};
```

**Usage:**

```javascript
// Full-screen notification
NotificationManager.openFullScreen({
   title: 'Doorbell',
   url: 'http://camera.local/doorbell',
   duration: 10000  // Optional, uses default if not specified
});

// Corner notification (stacked)
NotificationManager.openCorner({
   title: 'Motion Detected',
   url: 'http://camera.local/motion',
   duration: 15000
});

// Close specific notification
NotificationManager.closeFullScreen();
NotificationManager.closeCorner('http://camera.local/motion');

// Close all notifications
NotificationManager.closeAllCorner();
```

**Home Assistant Automation Example:**

```yaml
automation:
  - alias: "Show doorbell camera"
    trigger:
      - platform: state
        entity_id: binary_sensor.doorbell
        to: 'on'
    action:
      - service: rest_command.tileboard_notification
        data:
          message: |
            NotificationManager.openFullScreen({
              title: 'Doorbell',
              url: 'http://camera.local/stream',
              duration: 10000
            });
```

---

### ErrorLogger

Production-grade error tracking with auto-heal capabilities.

**Features:**
- Rate limiting (10 errors/min default)
- Error deduplication (5s window)
- Async retry queue with exponential backoff
- Circular reference detection
- Auto-recovery for transient failures

**Initialization:**

```javascript
CONFIG.features = {
   errorLogging: {
      enabled: true,
      homeAssistantEntity: 'input_text.tileboard_errors',
      maxErrorsPerMinute: 10,
      deduplicationWindow: 5000,  // 5 seconds
      maxRetries: 3,
      retryDelay: 1000,  // 1 second
   }
};
```

**Usage:**

```javascript
// Automatic global error catching is enabled by default

// Manual error logging
try {
   // Some risky operation
} catch (error) {
   ErrorLogger.logError(error, {
      component: 'CustomTile',
      action: 'handleClick',
      additionalData: { tileId: 'light.bedroom' }
   });
}

// The logger will automatically:
// - Deduplicate identical errors within 5s window
// - Rate limit to prevent flooding
// - Retry failed sends with exponential backoff
// - Send to Home Assistant input_text entity
```

---

### LocationDetector

Multi-panel location service for upstairs/downstairs setups.

**Features:**
- URL parameter detection (?location=upstairs)
- Cookie persistence (7 days default)
- Window object caching for O(1) access
- Configurable location names

**Initialization:**

```javascript
CONFIG.features = {
   locationDetection: {
      enabled: true,
      urlParameter: 'location',
      cookieExpiry: 7,  // days
      locations: {
         upstairs: 'upstair',     // Note: keeping original spelling
         downstairs: 'downstairs',
      },
      defaultLocation: 'downstairs',
   }
};
```

**Usage:**

```javascript
// In config.js tiles
{
   id: 'light.bedroom',
   type: TYPES.LIGHT,
   title: 'Bedroom',
   hidden: LocationDetector.isUpstairs(),  // Hide on downstairs panel
}

// Or use the backward-compatible global functions
{
   hidden: isUpstairsLocation()  // Same as LocationDetector.isUpstairs()
}

// Manual location management
LocationDetector.setLocation('upstairs');
LocationDetector.getLocation();  // Returns 'upstair'
LocationDetector.isLocation('upstair');  // Returns true
```

---

## Tile Helpers

### Climate Helpers

Enhanced climate control with HON AC integration.

#### Standard Climate Tile

```javascript
import { createClimatePopup } from './scripts/globals/utils.js';

// In your CONFIG.pages
{
   tiles: [
      createClimatePopup({
         id: 'climate.living_room',
         title: 'Living Room',
         floorHeatingId: 'binary_sensor.floor_heating',  // Optional
         realTempSensorId: 'sensor.living_room_temp',    // Optional
         minTemp: 16,
         maxTemp: 30,
         step: 0.5,
      })
   ]
}
```

**Features:**
- Built-in SLIDER for temperature control
- Floor heating sensor override for icon
- Real temperature sensor override for display
- Standard HVAC mode support

#### HON AC Integration

```javascript
import { createHONClimatePopup } from './scripts/globals/utils.js';

{
   tiles: [
      createHONClimatePopup({
         id: 'climate.ac_salon',
         title: 'Salon AC',
         deviceId: 'your_hon_device_id_here',
         floorHeatingId: 'binary_sensor.floor_heating',
         realTempSensorId: 'sensor.real_temp',
         minTemp: 16,
         maxTemp: 30,
         honPrograms: {
            cool: 'iot_cool',
            heat: 'iot_heat',
            uv: 'iot_uv_and_cool',
         }
      })
   ]
}
```

**Features:**
- Custom HON AC program integration
- Debounced API requests (2000ms) to prevent flooding
- Single combined API call for mode+temp changes
- Temperature +/- controls with inline HTML
- Mode switching with visual feedback

#### Floor Heating Sensor

```javascript
import { createFloorHeatingSensor } from './scripts/globals/utils.js';

{
   tiles: [
      createFloorHeatingSensor('binary_sensor.floor_heating', 'Floor Heating')
   ]
}
```

---

### Light Track Helpers

Grid-based track light control with popup.

#### Dual Area Light Track (Most Common)

```javascript
import { createDualAreaLightTrack } from './scripts/globals/utils.js';

{
   tiles: [
      createDualAreaLightTrack({
         id: 'switch.track_lights',
         title: 'Track Lights',
         x: 0,
         y: 0,
         salonCount: 12,
         salonMainIndexes: [3, 6, 9, 12],    // Main lights with different icon
         salonPrefix: 'light.szyna_salon_',
         kitchenCount: 7,
         kitchenMainIndexes: [1, 4, 7],
         kitchenPrefix: 'light.szyna_kuchnia_',
         hidden: LocationDetector.isUpstairs(),
         reverseSalon: true,                  // Right to left ordering
         popupTimeout: 60000,                  // Auto-close after 60s
      })
   ]
}
```

**Features:**
- Dual area layout (horizontal salon + vertical kitchen)
- Main light markers with `mdi-track-light` icon
- Regular lights with `mdi-lightbulb-spot` icon
- Auto-closing popup (default 60s)
- Configurable grid size (default 13x7)
- Toggle main switch on primary action
- Open popup on secondary action

#### Advanced Custom Layout

```javascript
import {
   createLightTrackTile,
   createHorizontalLayout,
   createVerticalLayout
} from './scripts/globals/utils.js';

// Create custom light arrangement
const myLights = [
   ...createHorizontalLayout({
      count: 10,
      y: 5,
      entityPrefix: 'light.track_',
      mainIndexes: [2, 5, 8],
      reverse: false,
   }),
   ...createVerticalLayout({
      count: 6,
      x: 10,
      entityPrefix: 'light.wall_',
      mainIndexes: [1, 3, 5],
      reverse: true,
   })
];

{
   tiles: [
      createLightTrackTile({
         id: 'switch.all_lights',
         title: 'All Lights',
         x: 0,
         y: 0,
         lights: myLights,
         popupWidth: 12,
         popupHeight: 8,
         tileSize: 80,
         popupTimeout: 30000,  // 30 seconds
      })
   ]
}
```

---

### PIN Protection

Secure PIN-based access control for tiles.

```javascript
import { pinProtectedTile, clearPinLockout } from './scripts/globals/utils.js';

// Wrap any tile with PIN protection
{
   tiles: [
      pinProtectedTile(
         {
            // Your original tile configuration
            id: 'switch.alarm_system',
            type: TYPES.SWITCH,
            title: 'Alarm System',
            // ... other tile properties
         },
         {
            // PIN protection configuration
            pins: ['1234', '5678'],
            attemptsAllowed: 3,
            timeoutSeconds: 30,
            lockTimeMultiplier: 2,  // 30s, 60s, 120s, ...
         }
      )
   ]
}

// Clear lockout manually (e.g., from admin panel)
clearPinLockout('switch.alarm_system');

// Check lockout status
const status = getPinLockoutStatus('switch.alarm_system');
// Returns: { locked: boolean, remainingTime: number }
```

**Features:**
- Multiple valid PINs
- Attempt limiting with exponential lockout
- Visual lockout feedback
- Centralized state management
- Secure PIN validation
- Auto-cleanup on success

---

## Utility Functions

All utility functions are available via `scripts/globals/utils.js`:

### Polish Localization

```javascript
import {
   dzienTygodnia,
   relativeTimeSinceDate,
   relativeTimeFromMinutes
} from './scripts/globals/utils.js';

// Day of week formatter
const dayName = dzienTygodnia(new Date());
// Returns: "Dziś (Po.)" or "Jutro (Wt.)" or "Śro."

// Relative time since date
const timeSince = relativeTimeSinceDate(lastTriggered);
// Returns: "5m", "2g 30m", "3d 12g", "2mies 5d"

// Relative time from minutes
const timeRemaining = relativeTimeFromMinutes(120);
// Returns: "2g 0m"
```

### Power/Energy Utilities

```javascript
import {
   formatWatts,
   calculateColor,
   calculateStripesColor,
   calculateTransparentColor
} from './scripts/globals/utils.js';

// Format watts or kilowatts
formatWatts(500);      // "500W"
formatWatts(2500);     // "2.50kW"
formatWatts(1500, true);  // "1.50kW" (force kW)

// Calculate color gradient (green→yellow→orange→red)
const color = calculateColor(2000, 2500, 6000);
// Returns: "rgba(255, 128, 0, 0.9)"

// Stripe colors for import/export
const stripes = calculateStripesColor(-500);  // Negative = export
// Returns: ['#FFF', 'rgba(0, 0, 255, 0.7)']

// Transparent color
const transparent = calculateTransparentColor('rgba(255, 128, 0, 0.9)', 0.3);
// Returns: "rgba(255, 128, 0, 0.3)"
```

### General Utilities

```javascript
import {
   roundToTwoDecimalPlaces,
   isTimeInRange,
   updateFontSize
} from './scripts/globals/utils.js';

// Round and remove .00 suffix
roundToTwoDecimalPlaces(5.00);   // "5"
roundToTwoDecimalPlaces(3.14);   // "3.14"

// Time range check (handles overnight ranges)
isTimeInRange('22:00', '06:00');  // true if currently between 10PM-6AM

// Dynamic font size update
updateFontSize(14);  // Sets font size to 14px
```

### Weather Utilities

```javascript
import {
   getPolishWeatherState,
   getWeatherIcon,
   WEATHER_STATES_PL,
   WEATHER_ICONS_PL
} from './scripts/globals/constants.js';

// Get Polish weather state
getPolishWeatherState('rainy');  // "Deszcz"

// Get weather icon
getWeatherIcon('clear-night');   // "clear"

// Direct access to mappings
WEATHER_STATES_PL['cloudy'];     // "Zachmurzenie"
WEATHER_ICONS_PL['rainy'];       // "rain"
```

---

## Power Usage Indicator

Animated gradient power indicator at bottom of screen.

**Enable in CONFIG:**

```javascript
CONFIG.powerIndicator = {
   enabled: true,
   entityId: 'sensor.power_usage',
   maxPower: 6000,              // Maximum power for color scale
   maxOrangePower: 2500,        // Power level for orange color
   maxAnimationPower: 6000,     // Power level for max animation speed
};
```

**Features:**
- Animated gradient progress bar
- Color gradient based on power usage:
  - Negative (export): Green → Yellow
  - Low (0-2500W): Yellow → Orange
  - High (2500-6000W): Orange → Red
- Animation direction based on import/export
- Animation speed based on power level
- Automatic entity state tracking

**Manual Control:**

The directive is automatically added to `index.html` and controlled via CONFIG. No manual tile configuration needed.

---

## Configuration

### Full CONFIG Example

```javascript
// config.js

var CONFIG = {
   // ... existing config

   // Power indicator (bottom bar)
   powerIndicator: {
      enabled: true,
      entityId: 'sensor.power_usage',
      maxPower: 6000,
      maxOrangePower: 2500,
      maxAnimationPower: 6000,
   },

   // Feature services
   features: {
      // Error logging
      errorLogging: {
         enabled: true,
         homeAssistantEntity: 'input_text.tileboard_errors',
         maxErrorsPerMinute: 10,
         deduplicationWindow: 5000,
         maxRetries: 3,
         retryDelay: 1000,
      },

      // Notifications
      notifications: {
         enabled: true,
         defaultFullScreenDuration: 5000,
         defaultCornerDuration: 10000,
         maxCornerNotifications: 3,
      },

      // Location detection
      locationDetection: {
         enabled: true,
         urlParameter: 'location',
         cookieExpiry: 7,
         locations: {
            upstairs: 'upstair',
            downstairs: 'downstairs',
         },
         defaultLocation: 'downstairs',
      },
   },

   // Pages and tiles
   pages: [
      {
         title: 'Main',
         bg: 'images/bg1.jpeg',
         icon: 'mdi-home-outline',
         groups: [
            {
               title: 'Climate',
               items: [
                  createClimatePopup({
                     id: 'climate.living_room',
                     title: 'Living Room',
                  }),
                  createHONClimatePopup({
                     id: 'climate.bedroom_ac',
                     title: 'Bedroom AC',
                     deviceId: 'your_device_id',
                  }),
               ]
            },
            {
               title: 'Lights',
               items: [
                  createDualAreaLightTrack({
                     id: 'switch.track_lights',
                     title: 'Track Lights',
                     x: 0,
                     y: 0,
                  }),
                  pinProtectedTile(
                     {
                        id: 'switch.all_lights_off',
                        type: TYPES.SWITCH,
                        title: 'All Off',
                     },
                     {
                        pins: ['1234'],
                        attemptsAllowed: 3,
                     }
                  ),
               ]
            },
         ]
      }
   ]
};
```

---

## Migration Guide

### From Old config.js to New Helpers

**Old way (inline functions):**

```javascript
function szynaSwiatla(switchId, title, x, y) {
   // 100+ lines of complex logic...
}

tiles: [
   szynaSwiatla('switch.lights', 'Lights', 0, 0)
]
```

**New way (helper functions):**

```javascript
import { createDualAreaLightTrack } from './scripts/globals/utils.js';

tiles: [
   createDualAreaLightTrack({
      id: 'switch.lights',
      title: 'Lights',
      x: 0,
      y: 0,
   })
]
```

**Benefits:**
- ✅ Less code in config.js
- ✅ Better performance (optimized helpers)
- ✅ Easier to maintain
- ✅ Type-safe with JSDoc
- ✅ Reusable across projects
- ✅ Tested and documented

---

## Performance Notes

All refactored features include performance optimizations:

1. **NotificationManager**: O(1) duplicate checking with Set
2. **ErrorLogger**: Rate limiting and deduplication prevent flooding
3. **LocationDetector**: Window caching for O(1) subsequent access
4. **Climate Helpers**: 2000ms debounced API requests
5. **Light Track Helpers**: Minimal object creation, reusable layouts
6. **PIN Protection**: Centralized state in Map, not per-tile closures
7. **Utility Functions**: Cached constants, no re-allocation

---

## Troubleshooting

### Services not initializing

Check that CONFIG.features is defined before init.js runs:

```javascript
// Must be in config.js BEFORE any page definitions
var CONFIG = {
   features: {
      errorLogging: { enabled: true, ... },
      // ...
   }
};
```

### Helpers not found

Ensure imports are correct:

```javascript
// Correct
import { createClimatePopup } from './scripts/globals/utils.js';

// Incorrect
import { createClimatePopup } from 'utils';
```

### PIN protection not working

Check that window.TYPES is available:

```javascript
// In your config.js
console.log(window.TYPES);  // Should show object with TYPES definitions
```

### Power indicator not showing

Ensure it's enabled in CONFIG and entity exists:

```javascript
CONFIG.powerIndicator = {
   enabled: true,
   entityId: 'sensor.power_usage',  // Must exist in Home Assistant
};
```

---

## Support

For issues or questions:
- Check the TileBoard documentation: https://github.com/resoai/TileBoard
- Review this guide's examples
- Check browser console for errors
- Verify Home Assistant entities exist

---

## License

Same as TileBoard (MIT License)
