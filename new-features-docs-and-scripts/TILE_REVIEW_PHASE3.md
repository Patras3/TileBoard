# TileBoard Config - Phase 3 Review (Tiles 42-45 + Final Analysis)

## Tile 42: Washing Machine (Lines 1656-1713)

**Type**: `TYPES.CUSTOM`
**ID**: `sensor.pralka_washer_job_state`
**Complexity**: High (6/10)

### Analysis

✅ **GOOD**: Nice time remaining calculation
⚠️ **ISSUE 1**: Complex `customHtml` function (40 lines)
⚠️ **ISSUE 2**: Commented `hiddenNo` function (line 1659) - should be `hidden`?
⚠️ **ISSUE 3**: Time formatting logic (lines 1678-1687) is inline

**Time Calculation Pattern**:
```javascript
var hours = timeDifference.getUTCHours();
var minutes = timeDifference.getUTCMinutes();

var timeString = '';
if (hours > 0) {
   timeString += hours + ' godziny ';
}
if (minutes > 0 || hours === 0) {
   timeString += minutes + ' minut';
}
```

This could use `window.relativeTimeFromMinutes()` or similar helper.

**Verdict**: ⚠️ **COULD BE IMPROVED** - but acceptable

---

## Tile 43: Dryer (Lines 1714-1769)

**Type**: `TYPES.CUSTOM`
**ID**: `sensor.suszarka_dryer_job_state`
**Complexity**: High (6/10)

### Analysis

🔴 **CRITICAL**: **DUPLICATE CODE!**

Lines 1724-1748 are ALMOST IDENTICAL to washing machine lines 1666-1690!

Only differences:
- Sensor names: `sensor.pralka_*` vs `sensor.suszarka_*`
- Icon: `mdi-washing-machine` vs `mdi-tumble-dryer`
- States mapping (slightly different)

**Recommendation**: 🔴 **NEEDS REFACTORING**

Create `scripts/helpers/applianceHelpers.js`:
```javascript
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

         const completionTime = new Date(this.$scope.states[completionSensor]?.state);
         const timeRemaining = window.formatTimeRemaining(completionTime);

         return `<div class="item-entity">
            <span class="item-entity--icon mdi ${icon}"></span>
         </div><br/><div>${timeRemaining}</div>`;
      },
      states,
      icons: Object.fromEntries(
         Object.keys(states).map(key => [
            key,
            key === 'finished' ? 'mdi-checkbox-marked-circle-outline' : 'mdi-checkbox-blank-circle-outline'
         ])
      ),
   };
}
```

Usage:
```javascript
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
```

**Savings**: ~60 lines × 2 appliances = **~120 lines**

---

## Tile 44: Frigate Storage (Lines 1770-1829)

**Type**: `TYPES.CUSTOM`
**ID**: `{}` (empty)
**Complexity**: High (7/10)

### Analysis

⚠️ **ISSUE 1**: Inline helper function `formatSizeMB()` (lines 1788-1801)
   - Should be moved to `window.formatBytes()` or `window.formatStorageSize()`

⚠️ **ISSUE 2**: Complex multi-sensor state reading (lines 1804-1813)

✅ **GOOD**: Nice storage display UI

**Recommendation**: ⚠️ **EXTRACT INLINE HELPER**

The `formatSizeMB()` function should be in `scripts/globals/utils.js`:
```javascript
export function formatStorageSize(megabytes, decimals = 2) {
   if (megabytes >= 1024 * 1024) {
      return (megabytes / (1024 * 1024)).toFixed(decimals) + ' TB';
   } else if (megabytes >= 1024) {
      return (megabytes / 1024).toFixed(decimals) + ' GB';
   } else {
      return megabytes.toFixed(0) + ' MB';
   }
}
```

Then in config:
```javascript
var usageImagesText = window.formatStorageSize(usageImagesMB);
var usageOthersText = window.formatStorageSize(usageOthersMB);
var freeText = window.formatStorageSize(freeMB);
```

**Verdict**: ⚠️ **MINOR IMPROVEMENT** - extract inline function

---

## Tile 45: Refresh Button (Lines 1831-1849)

**Type**: `TYPES.CUSTOM`
**ID**: `{}` (empty)
**Complexity**: Low (1/10)

### Analysis

✅ **GOOD**: Simple, clean implementation
✅ **GOOD**: Uses `location.reload()` for refresh

**Verdict**: ✅ **KEEP AS IS**

---

## Empty Groups (Lines 1857-1920)

Found several groups with empty `items: []` arrays:
- "Kamery" (line 1857-1866)
- "Temperatura" (line 1869-1875)
- "Energia" (line 1876-1881)
- "Zasłony/akcje" (line 1882-1887)
- More...

**Recommendation**: 🟡 **CLEAN UP** - Remove empty groups or add comment explaining their purpose

---

## FINAL COMPREHENSIVE ANALYSIS

### Total Tiles Reviewed: 45

### Breakdown by Status:

✅ **Excellent (No Issues)** - 18 tiles (40%)
- Weather, Windy, Automations (4x), Energy (3x), PIN protected garage, Media players (3x), Vacuum (2x), Simple lights (2x)

⚠️ **Minor Issues** - 15 tiles (33%)
- Climate tiles (commented code)
- Cover tiles (boilerplate)
- Power usage (undefined function)
- Appliances (could use helper)
- Frigate storage (inline function)

🔴 **Needs Refactoring** - 8 tiles (18%)
- Trash calendar (complex + hardcoded days)
- Ventilation (duplicate code)
- Calendar events (complex + hardcoded days)
- 3D printer (missing window.* prefix)
- Light tiles (8x - massive boilerplate)
- Camera tiles (7x - massive boilerplate)
- Washing machine & Dryer (duplicate code)

🟡 **Dead Code** - 6+ blocks (4%)
- Commented code throughout config

---

## CRITICAL BUGS FOUND

### 1. Missing `window.` Prefix (2 instances)
- ❌ Line 1419: `relativeTimeFromMinutes()` → should be `window.relativeTimeFromMinutes()`
- ❌ Line 730: `updateFlowingIndicator()` → **UNDEFINED** - remove or fix

### 2. Hardcoded Polish Days (2 instances)
- ❌ Lines 403-404 (trash calendar): Hardcoded array instead of `window.dzienTygodnia()`
- ❌ Lines 1509-1517 (events calendar): Hardcoded array instead of `window.dzienTygodnia()`

### 3. Duplicate Code (3 instances)
- ❌ Ventilation tile: Fan mode switch duplicated in `customHtml` and `action`
- ❌ Washing machine & Dryer: Nearly identical ~60 line implementations
- ❌ Light tiles: 8 tiles with identical structure (~30 lines each)
- ❌ Camera tiles: 7 tiles with identical structure (~25 lines each)

---

## BOILERPLATE ANALYSIS

### Massive Code Duplication:

| Pattern | Count | Lines Each | Total Lines | Potential Helper |
|---------|-------|------------|-------------|------------------|
| Light tiles | 8 | ~30 | **240** | `createLightTile()` |
| Camera tiles | 7 | ~25 | **175** | `createCameraTile()` |
| Appliances | 2 | ~60 | **120** | `createApplianceTile()` |
| Cover tiles | 3 | ~25 | **75** | `createCoverTile()` |
| **TOTAL** | **20** | - | **610 lines** | **4 helpers** |

**Potential Reduction**: From 2063 lines to ~1450 lines (**29.7% smaller!**)

---

## RECOMMENDED HELPER MODULES

### Priority 1 - Critical Fixes:
1. ✅ `scripts/globals/utils.js` - Add missing `formatStorageSize()`
2. ✅ Fix hardcoded Polish days (use existing `window.dzienTygodnia()`)
3. ✅ Fix missing `window.` prefixes
4. ✅ Remove/fix `updateFlowingIndicator()` call

### Priority 2 - High Impact Helpers (610 lines saved):
5. 🆕 `scripts/helpers/lightHelpers.js` - **createLightTile()** (240 lines saved)
6. 🆕 `scripts/helpers/cameraHelpers.js` - **createCameraTile()** (175 lines saved)
7. 🆕 `scripts/helpers/applianceHelpers.js` - **createApplianceTile()** (120 lines saved)
8. 🆕 `scripts/helpers/coverHelpers.js` - **createCoverTile()** (75 lines saved)

### Priority 3 - Code Quality:
9. 🆕 `scripts/helpers/trashCalendarHelpers.js` - Extract complex trash calendar logic
10. 🆕 `scripts/helpers/ventilationHelpers.js` - Fan mode mapping
11. 🆕 `scripts/helpers/calendarHelpers.js` - Event parsing logic
12. ✅ Remove all dead code (6+ blocks)

---

## FINAL STATISTICS

### Current State:
- **config.js**: 2063 lines
- **Custom functions in tiles**: 51
- **Complex tiles (≥5 complexity)**: 12
- **Boilerplate tiles**: 20
- **Dead code blocks**: 6+

### After All Improvements:
- **Estimated config.js**: ~1450 lines (**29.7% reduction**)
- **New helper modules**: 7
- **Bugs fixed**: 5
- **Dead code removed**: 6+ blocks
- **Quality**: Production-ready, maintainable, DRY

---

## NEXT ACTIONS

1. **IMMEDIATE** (Critical Bugs):
   - Fix `relativeTimeFromMinutes()` call (line 1419)
   - Fix hardcoded Polish days (2 instances)
   - Remove/fix `updateFlowingIndicator()` call (line 730)

2. **HIGH PRIORITY** (Big Wins):
   - Create `lightHelpers.js` (240 lines saved)
   - Create `cameraHelpers.js` (175 lines saved)
   - Create `applianceHelpers.js` (120 lines saved)

3. **MEDIUM PRIORITY** (Code Quality):
   - Remove all dead code
   - Extract inline helpers
   - Refactor complex tiles

4. **TESTING**:
   - Verify all functionality works after changes
   - Check for any regression issues

---

**Review Complete!** ✅

All 45 tiles analyzed with detailed recommendations for improvements.
