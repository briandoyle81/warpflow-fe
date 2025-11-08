#!/usr/bin/env python3
import re
import os
from pathlib import Path

def extract_constants(content):
    """Extract PART and COLOR constants from Solidity file"""
    parts = {}
    colors = {}
    
    # Extract PART constants
    part_pattern = r'string private constant (PART_\d+) = (.+?);'
    for match in re.finditer(part_pattern, content, re.DOTALL):
        name, value = match.groups()
        # Clean up the value - remove extra whitespace but preserve structure
        value = value.strip()
        # Remove quotes if present
        if value.startswith("'") and value.endswith("'"):
            value = value[1:-1]
        elif value.startswith('"') and value.endswith('"'):
            value = value[1:-1]
        parts[name] = value
    
    # Extract COLOR constants
    color_pattern = r'string private constant (COLOR_\d+) = (.+?);'
    for match in re.finditer(color_pattern, content, re.DOTALL):
        name, value = match.groups()
        value = value.strip()
        if value.startswith("'") and value.endswith("'"):
            value = value[1:-1]
        elif value.startswith('"') and value.endswith('"'):
            value = value[1:-1]
        colors[name] = value
    
    return parts, colors

def generate_typescript(solidity_file, output_dir):
    """Generate TypeScript file from Solidity file"""
    with open(solidity_file, 'r') as f:
        content = f.read()
    
    # Extract renderer name
    renderer_match = re.search(r'contract (\w+)', content)
    if not renderer_match:
        return False
    renderer_name = renderer_match.group(1)
    
    # Extract constants
    parts, colors = extract_constants(content)
    
    if not parts:
        print(f"No parts found in {renderer_name}")
        return False
    
    # Determine function name (camelCase)
    func_name = renderer_name[0].lower() + renderer_name[1:]
    
    # Generate TypeScript
    ts_content = f'''/**
 * {renderer_name}
 * Ported from {os.path.basename(solidity_file)}
 */

import {{ Ship }} from "../../../types/types";
import {{ blendHSL }} from "../utils";

'''
    
    # Add PART constants
    for name in sorted(parts.keys(), key=lambda x: int(x.split('_')[1])):
        value = parts[name]
        # Escape backslashes and quotes
        value = value.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
        ts_content += f"const {name} = `{value}`;\n\n"
    
    # Add COLOR constants
    for name in sorted(colors.keys(), key=lambda x: int(x.split('_')[1])):
        value = colors[name]
        ts_content += f'const {name} = "{value}";\n'
    
    # Generate render function
    ts_content += f'''
export function {func_name}(ship: Ship): string {{
'''
    
    # Determine chunk structure based on number of parts
    part_count = len(parts)
    color_count = len(colors)
    
    # Split into two chunks (typical pattern)
    mid_point = (part_count + 1) // 2
    
    # Build chunk1
    ts_content += "  const chunk1 =\n"
    chunk1_parts = []
    for i in range(1, mid_point + 1):
        part_name = f"PART_{i}"
        if part_name in parts:
            chunk1_parts.append(f"    {part_name} +")
            if i < mid_point:
                color_name = f"COLOR_{i}"
                if color_name in colors:
                    chunk1_parts.append(
                        f"    (ship.shipData.shiny\n"
                        f"      ? blendHSL(\n"
                        f"          ship.traits.colors.h1,\n"
                        f"          ship.traits.colors.s1,\n"
                        f"          ship.traits.colors.l1,\n"
                        f"          {color_name}\n"
                        f"        )\n"
                        f"      : {color_name}) +"
                    )
    
    ts_content += "\n".join(chunk1_parts).rstrip("+") + ";\n\n"
    
    # Build chunk2
    ts_content += "  const chunk2 =\n"
    chunk2_parts = []
    for i in range(mid_point + 1, part_count + 1):
        part_name = f"PART_{i}"
        if part_name in parts:
            chunk2_parts.append(f"    {part_name} +")
            if i < part_count:
                color_name = f"COLOR_{i}"
                if color_name in colors:
                    chunk2_parts.append(
                        f"    (ship.shipData.shiny\n"
                        f"      ? blendHSL(\n"
                        f"          ship.traits.colors.h1,\n"
                        f"          ship.traits.colors.s1,\n"
                        f"          ship.traits.colors.l1,\n"
                        f"          {color_name}\n"
                        f"        )\n"
                        f"      : {color_name}) +"
                    )
    
    ts_content += "\n".join(chunk2_parts).rstrip("+") + ";\n\n"
    
    ts_content += "  return chunk1 + chunk2;\n}\n"
    
    # Write output file
    output_file = output_dir / f"{renderer_name}.ts"
    with open(output_file, 'w') as f:
        f.write(ts_content)
    
    print(f"Generated {output_file}")
    return True

# Main execution
if __name__ == "__main__":
    renderers_dir = Path("render_contracts/Renderers")
    output_dir = Path("app/utils/shipRenderer/renderers")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # List of renderer files to process (excluding routers and utils)
    renderer_files = [
        "RenderSpecial2.sol",
        "RenderSpecial3.sol",
        "RenderAft0.sol",
        "RenderAft1.sol",
        "RenderAft2.sol",
        "RenderWeapon1.sol",
        "RenderWeapon2.sol",
        "RenderWeapon3.sol",
        "RenderWeapon4.sol",
        "RenderBaseBody.sol",
        "RenderShield1.sol",
        "RenderShield2.sol",
        "RenderShield3.sol",
        "RenderArmor1.sol",
        "RenderArmor2.sol",
        "RenderArmor3.sol",
        "RenderFore0.sol",
        "RenderFore1.sol",
        "RenderFore2.sol",
        "RenderForePerfect.sol",
    ]
    
    for filename in renderer_files:
        filepath = renderers_dir / filename
        if filepath.exists():
            generate_typescript(filepath, output_dir)
        else:
            print(f"Warning: {filepath} not found")
