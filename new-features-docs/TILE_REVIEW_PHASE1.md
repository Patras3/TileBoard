# TileBoard Config - Comprehensive Tile Review

## Analysis Summary

**Total Tiles Found**: 60
**Review Phases**: 3 (20 tiles each)
**Current Phase**: 1 (Tiles 1-20)

---

## PHASE 1: Tiles 1-20 Review

### Tile 1: Weather (Lines 300-367)
**Type**: `TYPES.WEATHER`
**ID**: `weather.openweathermap`
**Complexity**: Low (0)

**Analysis**:
✅ **GOOD**: Standard TileBoard weather tile configuration
✅ **GOOD**: Uses refactored `weatherIcons` and `weatherStates` from window helpers
✅ **NO ISSUES**: Clean implementation

**Verdict**: ✅ **KEEP AS IS**

---

### Tile 2: Trash/Garbage Calendar (Lines 368-467)
**Type**: `TYPES.CUSTOM`
**ID**: `calendar.smieci`
**Complexity**: High (6/10)

**Analysis**:
⚠️ **ISSUE 1**: Complex `state` function with inline date logic and Polish day names
⚠️ **ISSUE 2**: Very complex `customHtml` function (60 lines)
⚠️ **ISSUE 3**: Nested `events()` function inside `customHtml`
⚠️ **ISSUE 4**: Hardcoded Polish day names array - should use `window.dzienTygodnia()`
⚠️ **ISSUE 5**: Color mapping logic could be extracted to helper
⚠️ **ISSUE 6**: Commented out `hidden2` function (dead code)

**Problems**:
1. Line 403-404: Hardcoded Polish days array
   ```javascript
   var daysOfWeek = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
   stateText = daysOfWeek[eventDate.getDay()];
   ```
   **Should use**: `window.dzienTygodnia(eventDate)`

2. Lines 409-429: Complex event extraction logic should be a helper
   ```javascript
   function events (_this) {
      // 20 lines of logic...
   }
   ```

3. Lines 443-453: Trash type color mapping should be a helper
   ```javascript
   if (message.includes('PAPIER')) { color = 'blue'; }
   else if (message.includes('SZKŁO')) { color = 'green'; }
   // etc...
   ```

**Recommendation**: 🔴 **NEEDS REFACTORING**
- Create `scripts/helpers/trashCalendarHelpers.js`:
  - `getTrashEventDate(entity)` - date calculation
  - `getTrashEvents(sensorState)` - event extraction
  - `getTrashTypeColor(message)` - color mapping
  - `createTrashTile(config)` - complete tile generator
- Remove hardcoded Polish days, use `window.dzienTygodnia()`
- Remove dead code (hidden2)

---

### Tile 3: Windy Weather Map (Lines 469-478)
**Type**: `TYPES.IFRAME`
**Complexity**: Low (0)

**Analysis**:
✅ **GOOD**: Simple iframe configuration
⚠️ **NOTE**: Commented out old URL (line 476) - should be removed

**Verdict**: ✅ **MINOR CLEANUP** - Remove commented URL

---

### Tile 4: Ventilation Automation (Lines 480-499)
**Type**: `TYPES.AUTOMATION`
**ID**: `automation.wietrzenie`
**Complexity**: Medium (2/10)

**Analysis**:
✅ **GOOD**: Uses `window.relativeTimeSinceDate()` correctly (line 493)
✅ **GOOD**: Clean state function logic
✅ **NO ISSUES**: Proper refactored implementation

**Verdict**: ✅ **KEEP AS IS**

---

### Tiles 5-9: Climate Tiles (Lines 501-505)
**Type**: Climate (HON AC)
**IDs**:
- `climate.salon_klimatyzator`
- `climate.sypialnia_klimatyzator`
- `climate.biuro_klimatyzator`
- `climate.dzieciecy_klimatyzator`
- `climate.trzeci_pokoj_klimatyzator`
**Complexity**: Low (0) - using helpers

**Analysis**:
✅ **EXCELLENT**: All using `Object.assign()` + `window.createHONClimatePopup()`
✅ **GOOD**: Properly refactored with helper functions
✅ **GOOD**: Clean, consistent syntax
⚠️ **NOTE**: Lines 508-530 have commented out `pinProtectedAction` - **REMOVE DEAD CODE**

**Verdict**: ✅ **MINOR CLEANUP** - Remove commented code block

---

### Tile 10: Recuperation/Ventilation (Lines 531-613)
**Type**: `TYPES.CUSTOM`
**ID**: `climate.rekuperacja_temperatura_komfortu`
**Complexity**: High (7/10)

**Analysis**:
⚠️ **ISSUE 1**: DUPLICATE code - fan mode switch logic appears in BOTH `customHtml` (lines 537-559) AND `action` (lines 570-587)
⚠️ **ISSUE 2**: Complex inline switch statements (2 identical copies!)
⚠️ **ISSUE 3**: Custom state function with sensor lookups (lines 561-565)

**Duplicate Code**:
```javascript
// Lines 537-559 (in customHtml)
switch (fanMode) {
   case 'high': icon = 'fan-speed-3'; level = 3; break;
   case 'medium': icon = 'fan-speed-2'; level = 2; break;
   case 'low': icon = 'fan-speed-1'; level = 1; break;
   case 'off': icon = 'fan-off'; level = 0; break;
}

// Lines 570-587 (in action) - EXACT SAME LOGIC!
switch (fanMode) {
   case 'high': icon = 'fan-speed-3'; level = 3; break;
   case 'medium': icon = 'fan-speed-2'; level = 2; break;
   case 'low': icon = 'fan-speed-1'; level = 1; break;
   case 'off': icon = 'fan-off'; level = -1; break; // Only diff: -1 vs 0
}
```

**Recommendation**: 🔴 **NEEDS REFACTORING**
- Create `scripts/helpers/ventilationHelpers.js`:
  - `getFanModeIcon(fanMode)` - returns icon name
  - `getFanModeLevel(fanMode)` - returns level number
  - `createVentilationTile(config)` - complete tile generator
- Eliminate duplicate switch statements
- Consider if this should be a core TileBoard feature (custom CLIMATE type variant)

---

### Tile 11 (Commented): Heat Pump Climate (Lines 615-627)
**Type**: COMMENTED OUT
**Status**: 🟡 **DEAD CODE - REMOVE**

---

### Tile 12: Circulation Automation (Lines 628-664)
**Type**: `TYPES.AUTOMATION`
**ID**: `automation.wlacz_cyrkulacje`
**Complexity**: Medium (3/10)

**Analysis**:
✅ **GOOD**: Uses `window.relativeTimeSinceDate()` correctly (line 661)
⚠️ **ISSUE**: Custom subtitle function with switch statement (lines 633-645)
⚠️ **ISSUE**: Complex state function combining temperature display + automation state

**Potential Improvement**:
- The subtitle switch for water heater modes could be a mapping object
- Consider extracting to helper if this pattern repeats

**Verdict**: ⚠️ **MINOR IMPROVEMENT POSSIBLE** - but acceptable as-is

---

### Tile 13: Energy Consumption (Lines 667-684)
**Type**: `TYPES.SENSOR`
**ID**: `sensor.energia_zuzycie_dzisiaj`
**Complexity**: Medium (2/10)

**Analysis**:
✅ **GOOD**: Uses `window.roundToTwoDecimalPlaces()` correctly
✅ **GOOD**: Clean energy calculation logic
✅ **NO ISSUES**: Proper implementation

**Verdict**: ✅ **KEEP AS IS**

---

### Tile 14: Heating Energy (Lines 685-708)
**Type**: `TYPES.SENSOR`
**ID**: `sensor.energia_na_ogrzewanie_dzisiaj`
**Complexity**: Medium (2/10)

**Analysis**:
✅ **GOOD**: Uses `window.formatWatts()` correctly (line 695)
✅ **GOOD**: Percentage calculation with division by zero check
✅ **NO ISSUES**: Clean implementation

**Verdict**: ✅ **KEEP AS IS**

---

### Tile 15: Solar Energy Production (Lines 709-722)
**Type**: `TYPES.SENSOR`
**ID**: `sensor.inverter_dzienna_produkcja`
**Complexity**: Medium (3/10)

**Analysis**:
✅ **GOOD**: Uses `window.formatWatts()` and `window.roundToTwoDecimalPlaces()` correctly
✅ **GOOD**: Dynamic title showing current production
✅ **NO ISSUES**: Excellent use of helpers

**Verdict**: ✅ **KEEP AS IS**

---

### Tile 16: Current Power Usage (Lines 723-747)
**Type**: `TYPES.SENSOR`
**ID**: `sensor.glowny_total_system_power`
**Complexity**: Medium (4/10)

**Analysis**:
✅ **GOOD**: Uses `window.calculateColor()`, `window.formatWatts()`, `window.roundToTwoDecimalPlaces()`
⚠️ **ISSUE**: Calls global function `updateFlowingIndicator(watts, color)` (line 730)
   - This function is NOT in window.* namespace
   - Need to verify where it's defined and if it should be in utils

**Recommendation**: ⚠️ **VERIFY** - Check if `updateFlowingIndicator` is properly defined

---

### Tile 17 (Commented): Gauge Example (Lines 748-776)
**Type**: COMMENTED OUT
**Status**: 🟡 **DEAD CODE - REMOVE**

---

### Tiles 18-20: Cover Controls (Lines 779-855)
**IDs**:
- `cover.roleta_ogrod` (line 779)
- `cover.salon_bok` (line 804)
- `cover.zaslony_sypialnia` (line 829)

**Type**: `TYPES.CUSTOM`
**Complexity**: Low (1/10 each)

**Analysis**:
✅ **GOOD**: Simple, consistent cover toggle logic
✅ **GOOD**: Clean action/secondaryAction implementation
⚠️ **NOTE**: All 3 tiles have IDENTICAL structure (only ID/title differ)

**Potential Improvement**:
Could create a helper `window.createCoverTile(config)` to reduce boilerplate:
```javascript
window.createCoverTile({
   id: 'cover.roleta_ogrod',
   title: 'Salon - Ogród',
   position: [5, 0]
})
```

**Verdict**: ⚠️ **OPTIONAL HELPER** - would reduce code but not critical

---

## Pattern Analysis (Tiles 1-20)

### Issues Found:
1. **Dead Code**: 4 instances of commented code blocks (lines 476, 508-530, 615-627, 748-776)
2. **Complex Custom Functions**: 2 tiles with very complex logic (trash calendar, ventilation)
3. **Duplicate Code**: Ventilation tile has duplicate switch statement
4. **Hardcoded Arrays**: 1 instance (Polish days) instead of using helpers
5. **Missing Helper Usage**: Trash calendar not using available utilities
6. **Undefined Function Call**: `updateFlowingIndicator()` - needs verification
7. **Repetitive Boilerplate**: 3 cover tiles with identical structure

### Tiles by Status:
✅ **Perfect (8 tiles)**: Weather, Windy, Automation (2x), Energy (3x), PIN protected garage
⚠️ **Minor Issues (5 tiles)**: Climate tiles (commented code), Cover tiles (boilerplate), Power usage (updateFlowingIndicator)
🔴 **Needs Refactoring (2 tiles)**: Trash calendar, Ventilation
🟡 **Dead Code (4 blocks)**: Various commented sections

### Refactoring Priorities:
1. 🔴 **HIGH**: Ventilation tile - duplicate code, complex logic
2. 🔴 **HIGH**: Trash calendar - complex customHtml, hardcoded Polish days
3. ⚠️ **MEDIUM**: Remove all dead code (4 blocks)
4. ⚠️ **MEDIUM**: Verify `updateFlowingIndicator()` function location
5. 🟢 **LOW**: Create cover helper (optional - reduces boilerplate)

### Helper Modules to Create:
1. `scripts/helpers/trashCalendarHelpers.js` - trash event parsing and color mapping
2. `scripts/helpers/ventilationHelpers.js` - fan mode icons and level mapping
3. `scripts/helpers/coverHelpers.js` - (optional) cover tile generator

---

## Phase 1 Summary

**Tiles Reviewed**: 20 of 60 (33%)
**Critical Issues**: 2
**Dead Code Blocks**: 4
**Helper Modules Needed**: 2-3

**Next**: Continue with Phase 2 (Tiles 21-40)

