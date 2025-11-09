#!/usr/bin/env node

const fs = require('fs');

// Read config.js
const configContent = fs.readFileSync('/home/user/TileBoard/config.js', 'utf8');

// Extract just the CONFIG object (from line 66 onwards)
const configStart = configContent.indexOf('var CONFIG = {');
const configSection = configContent.substring(configStart);

let tileCount = 0;
let pageCount = 0;
let groupCount = 0;
const tilesWithCustomFunctions = [];

// Count pages
const pageMatches = configSection.match(/pages:\s*\[/g);
if (pageMatches) {
   // Try to count page objects
   const pagesStart = configSection.indexOf('pages: [');
   if (pagesStart !== -1) {
      const pagesSection = configSection.substring(pagesStart);
      const titleMatches = pagesSection.match(/title:\s*['"][^'"]+['"]/g);
      pageCount = titleMatches ? titleMatches.length : 0;
   }
}

// Count groups (approximate)
const groupMatches = configSection.match(/groups:\s*\[/g);
if (groupMatches) {
   groupCount = groupMatches.length;
}

// Count items (tiles) - look for position: [x, y] pattern
const positionMatches = configSection.match(/position:\s*\[(\d+),\s*(\d+)\]/g);
if (positionMatches) {
   tileCount = positionMatches.length;
}

// Find tiles with custom functions
const customFunctionMatches = configSection.match(/customHtml:\s*function|action:\s*function|state:\s*function|title:\s*function|value:\s*function|filter:\s*function|customStyles:\s*function/g);
if (customFunctionMatches) {
   tilesWithCustomFunctions.push(`Found ${customFunctionMatches.length} custom functions in tiles`);
}

// Find tiles with Object.assign (climate tiles)
const objectAssignMatches = configSection.match(/Object\.assign\([^)]+window\.create/g);
const climateCount = objectAssignMatches ? objectAssignMatches.length : 0;

// Find tiles with window.pinProtectedTile
const pinProtectedMatches = configSection.match(/window\.pinProtectedTile\(/g);
const pinProtectedCount = pinProtectedMatches ? pinProtectedMatches.length : 0;

// Find tiles with window.createDualAreaLightTrack
const lightTrackMatches = configSection.match(/window\.createDualAreaLightTrack\(/g);
const lightTrackCount = lightTrackMatches ? lightTrackMatches.length : 0;

console.log('=== TileBoard Config Analysis ===\n');
console.log(`Total Pages: ${pageCount}`);
console.log(`Total Groups: ${groupCount}`);
console.log(`Total Tiles: ${tileCount}`);
console.log('\nTile Type Breakdown:');
console.log(`- Climate tiles (HON): ${climateCount}`);
console.log(`- PIN protected tiles: ${pinProtectedCount}`);
console.log(`- Light track tiles: ${lightTrackCount}`);
console.log(`- Standard tiles: ${tileCount - climateCount - pinProtectedCount - lightTrackCount}`);
console.log('\nComplexity Indicators:');
console.log(`- Tiles with custom functions: ${customFunctionMatches ? customFunctionMatches.length : 0}`);

// Calculate tiles per phase (20 tiles each)
const tilesPerPhase = 20;
const totalPhases = Math.ceil(tileCount / tilesPerPhase);
console.log('\nReview Plan:');
console.log(`- Tiles per phase: ${tilesPerPhase}`);
console.log(`- Total phases needed: ${totalPhases}`);
for (let i = 0; i < totalPhases; i++) {
   const start = i * tilesPerPhase + 1;
   const end = Math.min((i + 1) * tilesPerPhase, tileCount);
   console.log(`  Phase ${i + 1}: Tiles ${start}-${end}`);
}
