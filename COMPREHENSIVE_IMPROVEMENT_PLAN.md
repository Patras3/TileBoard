# TileBoard Config - Comprehensive Improvement Plan

## Executive Summary

After a thorough review of all 45 tiles in your TileBoard configuration, I've identified significant opportunities for improvement that will:

- **Fix 5 critical bugs** affecting functionality
- **Reduce config size by ~30%** (2063 → ~1450 lines)
- **Eliminate 610 lines of boilerplate** code
- **Remove 6+ blocks of dead code**
- **Improve maintainability** with reusable helpers

---

## 🔴 CRITICAL BUGS (Must Fix Immediately)

### Bug 1: Missing `window.` Prefix - 3D Printer Tile
**Location**: Line 1419
**Issue**:
```javascript
var remainingTime = relativeTimeFromMinutes(...);  // ❌ WRONG
```
**Fix**:
```javascript
var remainingTime = window.relativeTimeFromMinutes(...);  // ✅ CORRECT
```

---

### Bug 2: Undefined Function Call - Power Usage Tile
**Location**: Line 730
**Issue**:
```javascript
updateFlowingIndicator(watts, color);  // ❌ Function doesn't exist!
```
**Fix**: **REMOVE** this line - the power indicator directive handles updates automatically via its watcher.

---

### Bug 3: Hardcoded Polish Days - Trash Calendar
**Location**: Lines 403-404
**Issue**:
```javascript
var daysOfWeek = ['Niedziela', 'Poniedziałek', ...];  // ❌ HARDCODED
stateText = daysOfWeek[eventDate.getDay()];
```
**Fix**:
```javascript
stateText = window.dzienTygodnia(eventDate);  // ✅ USE HELPER
```

---

### Bug 4: Hardcoded Polish Days - Events Calendar
**Location**: Lines 1509-1517
**Issue**: Same as Bug 3 - hardcoded days array
**Fix**: Replace lines 1524-1528 with:
```javascript
var label = eventDate.toDateString() === tomorrow.toDateString()
   ? 'Jutro (' + window.dzienTygodnia(eventDate).slice(0, 2) + '.)'
   : window.dzienTygodnia(eventDate).slice(0, 3) + '.';

if (eventDate.toDateString() === today.toDateString()) {
   label = 'Dziś (' + window.dzienTygodnia(eventDate).slice(0, 2) + '.)';
}
```

**Note**: Line 1562 correctly uses `window.dzienTygodnia()` - inconsistency in same tile!

---

### Bug 5: Duplicate Code - Ventilation Tile
**Location**: Lines 537-559 and 570-587
**Issue**: Identical switch statement appears twice (in `customHtml` and `action`)
**Impact**: Maintenance nightmare - changes must be made in two places

---

## 🟡 DEAD CODE (Remove for Cleanup)

| Lines | Description |
|-------|-------------|
| 476 | Commented Windy URL |
| 508-530 | Commented `pinProtectedAction` example |
| 615-627 | Commented heat pump climate tile |
| 748-776 | Commented gauge example |
| 1013 | Commented light track helper call |
| 1015-1043 | Commented track light tile #1 |
| 1044-1072 | Commented track light tile #2 |

**Total**: 7 blocks of dead code to remove

---

## 📊 MASSIVE BOILERPLATE OPPORTUNITY

### The Problem:

20 tiles follow repetitive patterns with nearly identical code:

| Tile Type | Count | Lines Each | Total Waste | Helper Name |
|-----------|-------|------------|-------------|-------------|
| Lights | 8 | ~30 | **240 lines** | `createLightTile()` |
| Cameras | 7 | ~25 | **175 lines** | `createCameraTile()` |
| Appliances (washer/dryer) | 2 | ~60 | **120 lines** | `createApplianceTile()` |
| Covers | 3 | ~25 | **75 lines** | `createCoverTile()` |
| **TOTAL** | **20** | - | **610 lines** | **4 helpers** |

### The Solution:

Create 4 helper modules to eliminate this boilerplate.

---

## 🚀 IMPROVEMENT IMPLEMENTATION PLAN

### Phase 1: Critical Bug Fixes (20 min)

**Priority**: IMMEDIATE
**Impact**: Fixes broken functionality

1. **Fix `relativeTimeFromMinutes` call** (line 1419)
   ```javascript
   // Change from:
   var remainingTime = relativeTimeFromMinutes(...);

   // To:
   var remainingTime = window.relativeTimeFromMinutes(...);
   ```

2. **Remove `updateFlowingIndicator` call** (line 730)
   ```javascript
   // DELETE this line:
   updateFlowingIndicator(watts, color);
   ```

3. **Fix hardcoded days in trash calendar** (lines 403-404)
   ```javascript
   // REPLACE:
   var daysOfWeek = ['Niedziela', ...];
   stateText = daysOfWeek[eventDate.getDay()];

   // WITH:
   stateText = window.dzienTygodnia(eventDate);
   ```

4. **Fix hardcoded days in events calendar** (lines 1509-1528)
   ```javascript
   // DELETE lines 1509-1517 (hardcoded array)

   // REPLACE lines 1524-1528 WITH:
   var label = eventDate.toDateString() === tomorrow.toDateString()
      ? 'Jutro (' + window.dzienTygodnia(eventDate).slice(0, 2) + '.)'
      : window.dzienTygodnia(eventDate).slice(0, 3) + '.';

   if (eventDate.toDateString() === today.toDateString()) {
      label = 'Dziś (' + window.dzienTygodnia(eventDate).slice(0, 2) + '.)';
   }
   ```

**Outcome**: All critical bugs fixed, config functional ✅

---

### Phase 2: Remove Dead Code (10 min)

**Priority**: MEDIUM
**Impact**: Cleaner, more maintainable code

Remove these commented blocks:
- Line 476: Old Windy URL
- Lines 508-530: pinProtectedAction example
- Lines 615-627: Heat pump climate
- Lines 748-776: Gauge example
- Line 1013: Light track call
- Lines 1015-1043: Track light #1
- Lines 1044-1072: Track light #2

**Outcome**: ~140 lines of dead code removed

---

### Phase 3: Create Helper Modules (90 min)

**Priority**: HIGH
**Impact**: 610 lines saved, huge maintainability improvement

#### 3.1. Light Helper (240 lines saved)

Create `/scripts/helpers/lightHelpers.js`:

```javascript
/**
 * Light Tile Helper
 * Creates standardized light control tiles with optional brightness slider
 */

export function createLightTile(config) {
   const {
      id,
      title,
      position,
      icon,
      iconOff,
      hidden,
      hasBrightness = true,
      states = { on: 'Wł.', off: 'Wył.' }
   } = config;

   const tile = {
      position,
      title,
      id,
      type: window.TYPES.LIGHT,
      states,
      icons: {
         on: icon || 'mdi-lightbulb',
         off: iconOff || (icon ? `${icon}-outline` : 'mdi-lightbulb-outline'),
      },
   };

   if (hidden !== undefined) {
      tile.hidden = hidden;
   }

   if (hasBrightness) {
      tile.sliders = [{
         title: 'Brightness',
         field: 'brightness',
         max: 255,
         min: 0,
         step: 5,
         request: {
            type: 'call_service',
            domain: 'light',
            service: 'turn_on',
            field: 'brightness',
         },
      }];
   }

   return tile;
}

// Export to window
if (typeof window !== 'undefined') {
   window.createLightTile = createLightTile;
}
```

**Usage in config.js**:
```javascript
// BEFORE (30 lines):
{
   position: [7, 0],
   title: 'Salon',
   id: 'light.salon_plafon',
   type: TYPES.LIGHT,
   hidden: isUpstairsLocation(),
   states: { on: 'Wł.', off: 'Wył.' },
   icons: {
      on: 'mdi-ceiling-light',
      off: 'mdi-ceiling-light-outline',
   },
   sliders: [{
      title: 'Brightness',
      field: 'brightness',
      max: 255,
      min: 0,
      step: 5,
      request: {
         type: 'call_service',
         domain: 'light',
         service: 'turn_on',
         field: 'brightness',
      },
   }],
},

// AFTER (7 lines):
window.createLightTile({
   id: 'light.salon_plafon',
   title: 'Salon',
   position: [7, 0],
   icon: 'mdi-ceiling-light',
   hidden: isUpstairsLocation()
}),
```

Apply to 8 light tiles → **Save 240 lines**

---

#### 3.2. Camera Helper (175 lines saved)

Create `/scripts/helpers/cameraHelpers.js`:

```javascript
/**
 * Camera Tile Helper
 * Creates standardized camera tiles with popup iframe
 */

export function createCameraTile(config) {
   const {
      id,
      title,
      position,
      width = 2,
      height = 1,
      hidden,
      refresh = 10000,
      customStyles,
      cameraName,  // Extract from ID if not provided
      baseUrl = 'http://192.168.50.164:8021/web/single-cam.html',
   } = config;

   const camName = cameraName || id.replace('camera.', '');

   return {
      position,
      id,
      type: window.TYPES.CAMERA,
      bgSize: 'cover',
      title,
      width,
      height,
      customStyles,
      state: false,
      hidden,
      action: function (item, entity) {
         this.$scope.openPopupIframe({
            title,
            url: `${baseUrl}?media=video+audio&camera=${camName}&showInitialImageEvenTooOld=true`,
            iframeStyles: {
               width: '100%',
               height: '100%',
               border: 'none',
            },
         });
      },
      refresh,
   };
}

// Export to window
if (typeof window !== 'undefined') {
   window.createCameraTile = createCameraTile;
}
```

**Usage**:
```javascript
// BEFORE (25 lines):
{
   position: [0, 3],
   id: 'camera.drzwi',
   type: TYPES.CAMERA,
   bgSize: 'cover',
   title: 'Drzwi',
   width: 2,
   height: 2,
   customStyles: { 'border-radius': '8px;' },
   state: false,
   action: function (item, entity) {
      this.$scope.openPopupIframe({
         title: 'Drzwi',
         url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=drzwi&showInitialImageEvenTooOld=true',
         iframeStyles: {
            width: '100%',
            height: '100%',
            border: 'none',
         },
      });
   },
   refresh: 10000,
},

// AFTER (8 lines):
window.createCameraTile({
   id: 'camera.drzwi',
   title: 'Drzwi',
   position: [0, 3],
   width: 2,
   height: 2,
   customStyles: { 'border-radius': '8px;' }
}),
```

Apply to 7 camera tiles → **Save 175 lines**

---

#### 3.3. Appliance Helper (120 lines saved)

Create `/scripts/helpers/applianceHelpers.js`:

```javascript
/**
 * Appliance Tile Helper (Washing Machine, Dryer, etc.)
 * Creates tiles for appliances with job state and completion time
 */

export function createApplianceTile(config) {
   const {
      id,
      title,
      position,
      icon,
      completionSensor,
      states,
      hiddenStates = ['finished', 'none', 'unavailable']
   } = config;

   // Helper to format time remaining
   function formatTimeRemaining(completionTime) {
      const currentTime = new Date();
      const timeDifference = new Date(completionTime - currentTime);

      const hours = timeDifference.getUTCHours();
      const minutes = timeDifference.getUTCMinutes();

      let timeString = '';
      if (hours > 0) {
         timeString += hours + ' godziny ';
      }
      if (minutes > 0 || hours === 0) {
         timeString += minutes + ' minut';
      }
      return timeString;
   }

   return {
      position,
      title,
      id,
      type: window.TYPES.CUSTOM,
      hidden: function () {
         const state = this.$scope.states[id].state;
         return hiddenStates.includes(state);
      },
      customHtml: function (item, entity) {
         if (entity.state === 'none') {
            return `<div class="item-entity">
               <span class="item-entity--icon mdi ${icon}"></span>
            </div>`;
         }

         const completionTimeEntity = this.$scope.states[completionSensor];
         const completionTime = new Date(completionTimeEntity?.state);
         const timeString = formatTimeRemaining(completionTime);

         return `<div class="item-entity">
            <span class="item-entity--icon mdi ${icon}"></span>
         </div><br/><div>${timeString}</div>`;
      },
      states,
      icons: Object.fromEntries(
         Object.keys(states).map(key => [
            key,
            (key === 'finished' || key === 'finish')
               ? 'mdi-checkbox-marked-circle-outline'
               : 'mdi-checkbox-blank-circle-outline'
         ])
      ),
   };
}

// Export to window
if (typeof window !== 'undefined') {
   window.createApplianceTile = createApplianceTile;
}
```

**Usage**:
```javascript
// Washing Machine
window.createApplianceTile({
   id: 'sensor.pralka_washer_job_state',
   title: 'Pralka',
   position: [8, 3],
   icon: 'mdi-washing-machine',
   completionSensor: 'sensor.pralka_washer_completion_time',
   states: {
      finish: 'Zakończona',
      none: 'Wył.',
      rinse: 'Płukanie',
      spin: 'Wirowanie',
      wash: 'Pranie',
      weightSensing: 'Wykrywanie wagi',
   }
}),

// Dryer
window.createApplianceTile({
   id: 'sensor.suszarka_dryer_job_state',
   title: 'Suszarka',
   position: [8, 4],
   icon: 'mdi-tumble-dryer',
   completionSensor: 'sensor.suszarka_dryer_completion_time',
   states: {
      none: 'Wył.',
      finished: 'Zakończona',
      cooling: 'Chłodzenie',
      drying: 'Suszenie',
      weightSensing: 'Ważenie',
   }
}),
```

Apply to 2 appliance tiles → **Save 120 lines**

---

#### 3.4. Cover Helper (75 lines saved)

Create `/scripts/helpers/coverHelpers.js`:

```javascript
/**
 * Cover Tile Helper
 * Creates standardized cover/blind/curtain control tiles
 */

export function createCoverTile(config) {
   const {
      id,
      title,
      position,
      hidden,
      states = { open: 'Otwarte', closed: 'Zamknięte', opening: '...' },
      icons = {
         closed: 'mdi-curtains-closed',
         open: 'mdi-curtains',
         opening: 'mdi-timer-sand'
      }
   } = config;

   return {
      position,
      type: window.TYPES.CUSTOM,
      title,
      id,
      hidden,
      action: function (item, entity) {
         this.apiRequest({
            type: 'call_service',
            domain: 'cover',
            service: entity.state === 'closed' ? 'open_cover' : 'close_cover',
            service_data: {
               entity_id: item.id,
            },
         });
      },
      states,
      icons,
      secondaryAction: function (item, entity) {
         return this.$scope.openPopupIframe(item, entity);
      },
   };
}

// Export to window
if (typeof window !== 'undefined') {
   window.createCoverTile = createCoverTile;
}
```

**Usage**:
```javascript
// BEFORE (25 lines each):
{
   position: [5, 0],
   type: TYPES.CUSTOM,
   title: 'Salon - Ogród',
   id: 'cover.roleta_ogrod',
   action: function (item, entity) {
      this.apiRequest({
         type: 'call_service',
         domain: 'cover',
         service: entity.state === 'closed' ? 'open_cover' : 'close_cover',
         service_data: { entity_id: item.id },
      });
   },
   states: { open: 'Otwarte', closed: 'Zamknięte' },
   icons: { closed: 'mdi-curtains-closed', open: 'mdi-curtains' },
   secondaryAction: function (item, entity) {
      return this.$scope.openPopupIframe(item, entity);
   },
},

// AFTER (5 lines):
window.createCoverTile({
   id: 'cover.roleta_ogrod',
   title: 'Salon - Ogród',
   position: [5, 0]
}),
```

Apply to 3 cover tiles → **Save 75 lines**

---

### Phase 4: Update Rollup Config (5 min)

**Add new helpers to `/scripts/main.js`**:

```javascript
// Existing imports...
import './models/notificationManager';
import './models/errorLogger';
// ... other imports ...

// Add new helper imports:
import './helpers/lightHelpers';
import './helpers/cameraHelpers';
import './helpers/applianceHelpers';
import './helpers/coverHelpers';
```

---

### Phase 5: Apply Changes to Config (30 min)

Replace boilerplate tiles with helper calls:

1. **8 light tiles** → `window.createLightTile(...)` calls
2. **7 camera tiles** → `window.createCameraTile(...)` calls
3. **2 appliance tiles** → `window.createApplianceTile(...)` calls
4. **3 cover tiles** → `window.createCoverTile(...)` calls

---

### Phase 6: Build & Test (15 min)

1. Run build: `npm run build`
2. Test all functionality
3. Verify no regressions

---

## 📈 EXPECTED RESULTS

### Before Improvements:
- **Lines**: 2063
- **Boilerplate**: 610 lines
- **Dead code**: ~140 lines
- **Bugs**: 5
- **Maintainability**: Medium

### After Improvements:
- **Lines**: ~1450 (**29.7% reduction**)
- **Boilerplate**: 0 lines (moved to helpers)
- **Dead code**: 0 lines
- **Bugs**: 0
- **Maintainability**: Excellent

### New Helper Modules:
1. ✅ `lightHelpers.js` (60 lines) - saves 240 lines
2. ✅ `cameraHelpers.js` (45 lines) - saves 175 lines
3. ✅ `applianceHelpers.js` (65 lines) - saves 120 lines
4. ✅ `coverHelpers.js` (40 lines) - saves 75 lines

**Total new code**: ~210 lines
**Total removed code**: ~750 lines (610 boilerplate + 140 dead code)
**Net savings**: **540 lines (26% reduction)**

---

## ⏱️ TOTAL TIME ESTIMATE

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Critical Bugs | 20 min | 🔴 IMMEDIATE |
| Phase 2: Dead Code | 10 min | ⚠️ MEDIUM |
| Phase 3: Helper Modules | 90 min | 🔴 HIGH |
| Phase 4: Rollup Config | 5 min | 🔴 HIGH |
| Phase 5: Apply Changes | 30 min | 🔴 HIGH |
| Phase 6: Build & Test | 15 min | 🔴 HIGH |
| **TOTAL** | **2h 50min** | - |

---

## 🎯 RECOMMENDATIONS

### Option A: Full Implementation (Recommended)
- Complete all 6 phases
- Time: ~3 hours
- Result: Production-ready, maintainable, bug-free config
- Savings: 540 lines, 5 bugs fixed

### Option B: Critical Fixes Only
- Complete Phase 1 only
- Time: 20 minutes
- Result: Bugs fixed, but boilerplate remains
- Savings: 5 bugs fixed

### Option C: Bugs + High-Impact Helpers
- Complete Phases 1, 3.1, 3.2
- Time: ~2 hours
- Result: Bugs fixed + light/camera helpers (415 lines saved)
- Savings: 5 bugs fixed, 415 lines removed

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Bugs ✅
- [ ] Fix `relativeTimeFromMinutes` call (line 1419)
- [ ] Remove `updateFlowingIndicator` call (line 730)
- [ ] Fix hardcoded days in trash calendar (lines 403-404)
- [ ] Fix hardcoded days in events calendar (lines 1509-1528)
- [ ] Test all affected tiles

### Phase 2: Dead Code ✅
- [ ] Remove 7 commented code blocks
- [ ] Verify no references to removed code

### Phase 3: Helpers ✅
- [ ] Create `lightHelpers.js`
- [ ] Create `cameraHelpers.js`
- [ ] Create `applianceHelpers.js`
- [ ] Create `coverHelpers.js`
- [ ] Add exports to window object

### Phase 4: Rollup ✅
- [ ] Update `scripts/main.js` imports
- [ ] Build successfully

### Phase 5: Config ✅
- [ ] Replace 8 light tiles
- [ ] Replace 7 camera tiles
- [ ] Replace 2 appliance tiles
- [ ] Replace 3 cover tiles

### Phase 6: Testing ✅
- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] All tiles display correctly
- [ ] All actions work (lights, covers, cameras, etc.)
- [ ] No console errors
- [ ] Commit changes
- [ ] Push to remote

---

**Ready to proceed with improvements!** 🚀

Choose your implementation option and we can start making these improvements.
