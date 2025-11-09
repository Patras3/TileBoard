# TileBoard Config - Phase 2 Review (Tiles 21-40)

## Tiles 21-30: Light Controls (Lines 981-1239)

### Pattern: Highly Repetitive Light Tiles

**Tiles analyzed**:
- Tile 21: `light.salon_plafon` (lines 981-1010)
- Tile 22: `light.szyna_cala` (line 1012) - ✅ **USING HELPER**
- Tile 23: `light.kuchnia` (lines 1073-1087)
- Tile 24: `light.tv_lampy` (lines 1088-1118)
- Tile 25: `light.salon` (lines 1119-1149)
- Tile 26: `light.sypialnia_glowne` (lines 1150-1179)
- Tile 27: `light.dzieciecy_glowne` (lines 1180-1209)
- Tile 28: `light.dzieciecy_lampka_nocna` (lines 1210-1239)

### Analysis

**DEAD CODE FOUND** (Lines 1013-1072):
- Commented out `window.createDualAreaLightTrack` call (line 1013)
- Two commented light tiles for track lights (lines 1015-1043, 1044-1072)

**MASSIVE BOILERPLATE**: All light tiles follow identical structure:
```javascript
{
   position: [x, y],
   title: '...',
   id: 'light....',
   type: TYPES.LIGHT,
   hidden: isUpstairsLocation() / isDownstairsLocation(),
   states: {
      on: 'Wł.',
      off: 'Wył.',
   },
   icons: {
      on: 'mdi-...',
      off: 'mdi-...-outline',
   },
   sliders: [
      {
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
      },
   ],
}
```

**Recommendation**: 🔴 **CREATE HELPER**
Create `scripts/helpers/lightHelpers.js` with:
```javascript
export function createLightTile(config) {
   const { id, title, position, icon, iconOff, hidden, hasBrightness = true } = config;

   const tile = {
      position,
      title,
      id,
      type: window.TYPES.LIGHT,
      states: { on: 'Wł.', off: 'Wył.' },
      icons: {
         on: icon || 'mdi-lightbulb',
         off: iconOff || (icon ? `${icon}-outline` : 'mdi-lightbulb-outline'),
      },
   };

   if (hidden !== undefined) tile.hidden = hidden;

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
```

Usage would become:
```javascript
window.createLightTile({
   id: 'light.salon_plafon',
   title: 'Salon',
   position: [7, 0],
   icon: 'mdi-ceiling-light',
   hidden: isUpstairsLocation()
}),
```

**Savings**: ~30 lines × 8 tiles = **~240 lines of boilerplate**

---

## Tiles 31-37: Camera Tiles (Lines 1244-1405)

### Pattern: Nearly Identical Camera Configurations

**Tiles analyzed**:
- `camera.drzwi` (lines 1244-1266)
- `camera.podjazd` (lines 1267-1289)
- `camera.ogrod` (lines 1290-1311)
- `camera.garaz` (lines 1312-1333)
- `camera.bok` (lines 1334-1356)
- `camera.przed_domem_duo` (lines 1357-1379)
- `camera.drukarka` (lines 1380-1405) - has `hidden` function

### Analysis

**EXTREME BOILERPLATE**: All camera tiles have IDENTICAL action function:
```javascript
action: function (item, entity) {
   this.$scope.openPopupIframe({
      title: '...',  // Only difference
      url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=...',  // Only difference
      iframeStyles: {
         width: '100%',
         height: '100%',
         border: 'none',
      },
   });
}
```

**Recommendation**: 🔴 **CREATE HELPER**
Create `scripts/helpers/cameraHelpers.js`:
```javascript
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
            url: `http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=${camName}&showInitialImageEvenTooOld=true`,
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
```

Usage:
```javascript
window.createCameraTile({
   id: 'camera.drzwi',
   title: 'Drzwi',
   position: [0, 3],
   width: 2,
   height: 2,
   customStyles: { 'border-radius': '8px;' }
}),
```

**Savings**: ~25 lines × 7 cameras = **~175 lines of boilerplate**

---

## Tile 38: 3D Printer Progress (Lines 1406-1449)

**Type**: `TYPES.CUSTOM`
**ID**: `{}` (empty)
**Complexity**: Medium (5/10)

### Analysis

⚠️ **ISSUE 1**: OLD FUNCTION CALL - Line 1419:
```javascript
var remainingTime = relativeTimeFromMinutes(parseInt(this.states['sensor.x1c_remaining_time'].state) || 0);
```
**Should be**: `window.relativeTimeFromMinutes()`

⚠️ **ISSUE 2**: Complex customHtml for progress bar display

✅ **GOOD**: Nice progress bar UI with custom CSS

**Verdict**: ⚠️ **FIX FUNCTION CALL** - missing window.* prefix

---

## Tile 39: Calendar Events (Lines 1452-1612)

**Type**: `TYPES.CUSTOM`
**ID**: `calendar.dom`
**Complexity**: VERY HIGH (9/10)

### Analysis

🔴 **CRITICAL ISSUE**: HARDCODED Polish days array (lines 1509-1517):
```javascript
var daysOfWeek = [
   'Niedziela',
   'Poniedziałek',
   'Wtorek',
   'Środa',
   'Czwartek',
   'Piątek',
   'Sobota',
];
```

**BUT**: Line 1562 in the `action` function correctly uses `window.dzienTygodnia()`!
```javascript
let weekDay = window.dzienTygodnia(startTime);
```

**INCONSISTENCY**: Same tile uses both hardcoded array AND the helper!

⚠️ **ISSUE 2**: Very complex `customHtml` function (55+ lines)
⚠️ **ISSUE 3**: Commented out `hidden2` function (dead code)
⚠️ **ISSUE 4**: Complex nested attribute checking repeated multiple times

**Recommendation**: 🔴 **NEEDS REFACTORING**
- Replace hardcoded daysOfWeek with `window.dzienTygodnia()` (lines 1524-1528)
- Extract event parsing logic to helper
- Remove `hidden2` dead code
- Create `scripts/helpers/calendarHelpers.js`:
  - `getCalendarEvents(sensorState, calendarId)` - safe event extraction
  - `formatEventLabel(eventDate)` - "Dziś", "Jutro", or day name
  - `createCalendarTile(config)` - complete tile generator

---

## Tiles 40-41: Automation Tiles (Lines 1614-1654)

### Tile 40: Usypianie (Sleep) Automation (Lines 1614-1633)

**Type**: `TYPES.AUTOMATION`
**ID**: `automation.usypianie`
**Complexity**: Medium (2/10)

**Analysis**:
✅ **GOOD**: Uses `window.relativeTimeSinceDate()` correctly (line 1627)
⚠️ **NOTE**: Complex state function with multiple conditionals

**Verdict**: ✅ **ACCEPTABLE**

### Tile 41: Kąpanie (Bathing) Automation (Lines 1635-1654)

**Type**: `TYPES.AUTOMATION`
**ID**: `automation.kapanie`
**Complexity**: Low (1/10)

**Analysis**:
✅ **GOOD**: Uses `window.relativeTimeSinceDate()` correctly (line 1648)
✅ **GOOD**: Simple, clean implementation

**Verdict**: ✅ **KEEP AS IS**

---

## Phase 2 Summary

**Tiles Reviewed**: 21-41 (21 tiles)
**Total Progress**: 41/60 (68%)

### Critical Issues Found:
1. **HARDCODED Polish days** - Calendar tile (AGAIN!)
2. **Missing window.* prefix** - 3D printer tile (relativeTimeFromMinutes)
3. **updateFlowingIndicator()** undefined call (from Phase 1)

### Massive Boilerplate Identified:
1. **Light tiles** - 8 tiles with ~30 lines each = **~240 lines**
2. **Camera tiles** - 7 tiles with ~25 lines each = **~175 lines**
3. **Total potential savings**: **~415 lines** (20% of config!)

### Dead Code Found:
- Lines 1013, 1015-1043, 1044-1072 (commented light track tiles)

### Refactoring Priorities (Updated):

#### 🔴 HIGH PRIORITY:
1. Calendar tile - replace hardcoded Polish days with `window.dzienTygodnia()`
2. 3D printer tile - fix `relativeTimeFromMinutes` call
3. Ventilation tile (from Phase 1) - duplicate code
4. Trash calendar (from Phase 1) - hardcoded days

#### ⚠️ MEDIUM PRIORITY:
5. Create `lightHelpers.js` - eliminate 240 lines of boilerplate
6. Create `cameraHelpers.js` - eliminate 175 lines of boilerplate
7. Remove all dead code (6+ blocks found so far)
8. Fix/remove `updateFlowingIndicator()` call

#### 🟢 LOW PRIORITY:
9. Cover helper (from Phase 1) - optional
10. Calendar helper - extract complex logic

### Helper Modules to Create:
1. ✅ `scripts/helpers/trashCalendarHelpers.js` - (from Phase 1)
2. ✅ `scripts/helpers/ventilationHelpers.js` - (from Phase 1)
3. 🆕 `scripts/helpers/lightHelpers.js` - **HIGH IMPACT** (240 lines saved)
4. 🆕 `scripts/helpers/cameraHelpers.js` - **HIGH IMPACT** (175 lines saved)
5. 🆕 `scripts/helpers/calendarHelpers.js` - event parsing logic
6. ⚠️ `scripts/helpers/coverHelpers.js` - (optional)

---

**Next**: Continue with Phase 3 (Tiles 42-60)
