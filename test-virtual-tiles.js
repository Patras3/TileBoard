#!/usr/bin/env node

/**
 * Standalone test for virtual tile entity lookup logic
 * Tests the getItemEntity() refactor without Angular dependencies
 */

// Mock states (simulating Home Assistant entities)
const mockStates = {
   'climate.real_ac': {
      state: 'cool',
      attributes: {
         temperature: 22,
         current_temperature: 24.5,
      },
   },
};

// Mock activePopup
let mockActivePopup = null;

// Track warnings
const warnings = [];
function warnUnknownItem (item) {
   const warning = `Entity "${item.id}" not found`;
   warnings.push(warning);
   console.warn(warning);
}

// Cached mock entity to prevent digest loops
const MOCK_ENTITY = { state: false, attributes: {} };

// Implementation of getItemEntity (EXACT COPY FROM main.js)
function getItemEntity (item) {
   // Virtual tiles don't have real entities - return a mock or parent entity
   if (item.state === false || item.virtual === true) {
      // For popup virtual tiles, use the popup's parent entity
      if (mockActivePopup && mockActivePopup.entity) {
         return mockActivePopup.entity;
      }
      // For other virtual tiles or when no parent entity, return cached mock
      return MOCK_ENTITY;
   }

   if (typeof item.id === 'object') {
      return item.id;
   }

   if (!(item.id in mockStates)) {
      warnUnknownItem(item);
      return null;
   }

   return mockStates[item.id];
}

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert (condition, testName, message) {
   if (condition) {
      console.log(`✓ ${testName}`);
      testsPassed++;
   } else {
      console.error(`✗ ${testName}`);
      console.error(`  FAILED: ${message}`);
      testsFailed++;
   }
}

function clearWarnings () {
   warnings.length = 0;
}

// Test Suite
console.log('='.repeat(60));
console.log('Virtual Tile Entity Lookup - Test Suite');
console.log('='.repeat(60));
console.log();

// Test 1: Virtual tile without popup context
console.log('Test 1: Virtual tile without popup (state: false)');
clearWarnings();
mockActivePopup = null;

const virtualTile1 = {
   id: 'climate.fake_mode_off',
   state: false,
   type: 'script',
};

const warningsBefore1 = warnings.length;
const entity1 = getItemEntity(virtualTile1);
const warningsAfter1 = warnings.length;

assert(
   warningsAfter1 === warningsBefore1,
   'No warnings for virtual tile',
   `Expected 0 warnings, got ${warningsAfter1 - warningsBefore1}`,
);
assert(
   entity1 && entity1.state === false && entity1.attributes,
   'Returns mock entity',
   `Expected mock entity, got ${JSON.stringify(entity1)}`,
);
console.log();

// Test 2: Virtual tile with popup context
console.log('Test 2: Virtual tile with popup (returns parent entity)');
clearWarnings();
mockActivePopup = {
   entity: mockStates['climate.real_ac'],
   item: { type: 'popup' },
};

const virtualTile2 = {
   id: 'climate.fake_mode_cool',
   state: false,
   type: 'script',
};

const warningsBefore2 = warnings.length;
const entity2 = getItemEntity(virtualTile2);
const warningsAfter2 = warnings.length;

assert(
   warningsAfter2 === warningsBefore2,
   'No warnings for popup virtual tile',
   `Expected 0 warnings, got ${warningsAfter2 - warningsBefore2}`,
);
assert(
   entity2 === mockStates['climate.real_ac'],
   'Returns parent climate entity',
   'Expected parent entity, got different entity',
);
assert(
   entity2 && entity2.state === 'cool',
   'Parent entity has correct state',
   `Expected state 'cool', got ${entity2?.state}`,
);

mockActivePopup = null;
console.log();

// Test 3: Regular tile lookup
console.log('Test 3: Regular tile lookup');
clearWarnings();

const regularTile = {
   id: 'climate.real_ac',
   type: 'climate',
};

const warningsBefore3 = warnings.length;
const entity3 = getItemEntity(regularTile);
const warningsAfter3 = warnings.length;

assert(
   warningsAfter3 === warningsBefore3,
   'No warnings for real entity',
   `Expected 0 warnings, got ${warningsAfter3 - warningsBefore3}`,
);
assert(
   entity3 === mockStates['climate.real_ac'],
   'Returns correct entity from states',
   `Expected real entity, got ${JSON.stringify(entity3)}`,
);
assert(
   entity3 && entity3.state === 'cool',
   'Entity has correct state',
   `Expected state 'cool', got ${entity3?.state}`,
);
console.log();

// Test 4: Non-existent entity (should warn)
console.log('Test 4: Non-existent entity (should warn)');
clearWarnings();

const nonExistentTile = {
   id: 'climate.does_not_exist',
   type: 'climate',
};

const warningsBefore4 = warnings.length;
const entity4 = getItemEntity(nonExistentTile);
const warningsAfter4 = warnings.length;

assert(
   warningsAfter4 > warningsBefore4,
   'Warns about missing entity',
   `Expected warning, got ${warningsAfter4 - warningsBefore4} warnings`,
);
assert(
   entity4 === null,
   'Returns null for non-existent entity',
   `Expected null, got ${JSON.stringify(entity4)}`,
);
console.log();

// Test 5: Object ID (virtual tile)
console.log('Test 5: Object ID (virtual tile)');
clearWarnings();

const virtualTileWithObjectId = {
   id: { state: 'on', attributes: { test: true } },
   type: 'custom',
};

const warningsBefore5 = warnings.length;
const entity5 = getItemEntity(virtualTileWithObjectId);
const warningsAfter5 = warnings.length;

assert(
   warningsAfter5 === warningsBefore5,
   'No warnings for object ID',
   `Expected 0 warnings, got ${warningsAfter5 - warningsBefore5}`,
);
assert(
   entity5 === virtualTileWithObjectId.id,
   'Returns object ID directly',
   'Expected object ID, got different object',
);
console.log();

// Test 6: Virtual property (alternative flag)
console.log('Test 6: Virtual property (virtual: true)');
clearWarnings();

const virtualTile6 = {
   id: 'climate.fake_mode_heat',
   virtual: true,
   type: 'script',
};

const warningsBefore6 = warnings.length;
const entity6 = getItemEntity(virtualTile6);
const warningsAfter6 = warnings.length;

assert(
   warningsAfter6 === warningsBefore6,
   'No warnings for virtual: true',
   `Expected 0 warnings, got ${warningsAfter6 - warningsBefore6}`,
);
assert(
   entity6 && entity6.state === false,
   'Returns mock entity for virtual flag',
   `Expected mock entity, got ${JSON.stringify(entity6)}`,
);
console.log();

// Summary
console.log('='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total:  ${testsPassed + testsFailed}`);
console.log();

if (testsFailed === 0) {
   console.log('✓ ALL TESTS PASSED!');
   process.exit(0);
} else {
   console.error('✗ SOME TESTS FAILED!');
   process.exit(1);
}
