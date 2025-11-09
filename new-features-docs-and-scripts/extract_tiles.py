#!/usr/bin/env python3

import re
import json

# Read config.js
with open('/home/user/TileBoard/config.js', 'r') as f:
    lines = f.readlines()

# Find CONFIG start
config_start = None
for i, line in enumerate(lines):
    if 'var CONFIG = {' in line:
        config_start = i
        break

if not config_start:
    print("CONFIG not found")
    exit(1)

# Join all lines for easier regex
content = ''.join(lines[config_start:])

# Extract items array
tiles = []
current_tile = {}
brace_count = 0
in_tile = False
tile_start_line = None
tile_content = []

# We need to parse the items: [ ] array
# Let's find it first
items_match = re.search(r'items:\s*\[', content)
if not items_match:
    print("items array not found")
    exit(1)

# Parse character by character to find tile boundaries
items_start = items_match.end()
i = items_start
depth = 1  # We're already inside items: [
tiles_raw = []
current_obj = ""
obj_depth = 0

while i < len(content) and depth > 0:
    char = content[i]

    if char == '[':
        depth += 1
    elif char == ']':
        depth -= 1
        if depth == 0:
            break

    if char == '{':
        if obj_depth == 0:
            current_obj = ""
        obj_depth += 1

    if obj_depth > 0:
        current_obj += char

    if char == '}':
        obj_depth -= 1
        if obj_depth == 0 and current_obj:
            tiles_raw.append(current_obj)
            current_obj = ""

    i += 1

print(f"Found {len(tiles_raw)} tile objects\n")

# Analyze each tile
for idx, tile_str in enumerate(tiles_raw, 1):
    analysis = {
        'index': idx,
        'has_position': bool(re.search(r'position:\s*\[', tile_str)),
        'has_custom_html': bool(re.search(r'customHtml:\s*function', tile_str)),
        'has_action': bool(re.search(r'action:\s*function', tile_str)),
        'has_state': bool(re.search(r'state:\s*function', tile_str)),
        'has_title_func': bool(re.search(r'title:\s*function', tile_str)),
        'has_value_func': bool(re.search(r'value:\s*function', tile_str)),
        'has_filter': bool(re.search(r'filter:\s*function', tile_str)),
        'has_custom_styles': bool(re.search(r'customStyles:\s*function', tile_str)),
        'uses_object_assign': bool(re.search(r'Object\.assign', tile_str)),
        'uses_window_helper': bool(re.search(r'window\.(create|pinProtected)', tile_str)),
        'type': None,
        'id': None,
        'title': None,
        'preview': tile_str[:200].replace('\n', ' ')
    }

    # Extract type
    type_match = re.search(r'type:\s*(?:TYPES\.)?(\w+)', tile_str)
    if type_match:
        analysis['type'] = type_match.group(1)

    # Extract ID
    id_match = re.search(r"id:\s*['\"]([^'\"]+)['\"]", tile_str)
    if id_match:
        analysis['id'] = id_match.group(1)

    # Extract title (string only)
    title_match = re.search(r"title:\s*['\"]([^'\"]+)['\"]", tile_str)
    if title_match:
        analysis['title'] = title_match.group(1)
    elif analysis['has_title_func']:
        analysis['title'] = '<function>'

    # Complexity score
    complexity = 0
    if analysis['has_custom_html']: complexity += 3
    if analysis['has_action']: complexity += 1
    if analysis['has_state']: complexity += 1
    if analysis['has_title_func']: complexity += 1
    if analysis['has_value_func']: complexity += 1
    if analysis['has_filter']: complexity += 1
    if analysis['has_custom_styles']: complexity += 2

    analysis['complexity_score'] = complexity

    tiles.append(analysis)

# Save to JSON
with open('/home/user/TileBoard/tiles_analysis.json', 'w') as f:
    json.dump(tiles, f, indent=2)

print(f"Saved detailed analysis to tiles_analysis.json")
print(f"\nComplexity Distribution:")

high_complexity = [t for t in tiles if t['complexity_score'] >= 5]
medium_complexity = [t for t in tiles if 2 <= t['complexity_score'] < 5]
low_complexity = [t for t in tiles if t['complexity_score'] < 2]

print(f"  High complexity (≥5): {len(high_complexity)} tiles")
print(f"  Medium complexity (2-4): {len(medium_complexity)} tiles")
print(f"  Low complexity (<2): {len(low_complexity)} tiles")

print(f"\nHelper Usage:")
print(f"  Using window helpers: {len([t for t in tiles if t['uses_window_helper']])} tiles")
print(f"  Using Object.assign: {len([t for t in tiles if t['uses_object_assign']])} tiles")

print(f"\nCustom Features:")
print(f"  Custom HTML: {len([t for t in tiles if t['has_custom_html']])} tiles")
print(f"  Custom action: {len([t for t in tiles if t['has_action']])} tiles")
print(f"  Custom state: {len([t for t in tiles if t['has_state']])} tiles")
print(f"  Custom styles: {len([t for t in tiles if t['has_custom_styles']])} tiles")
