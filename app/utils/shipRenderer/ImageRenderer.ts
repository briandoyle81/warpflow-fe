/**
 * Main ImageRenderer orchestrator
 * Ported from ImageRenderer.sol
 */

import { Ship } from "../../types/types";
import { renderSpecial } from "./renderers/RenderSpecial";
import { renderAft } from "./renderers/RenderAft";
import { renderWeapon } from "./renderers/RenderWeapon";
import { renderBody } from "./renderers/RenderBody";
import { renderFore } from "./renderers/RenderFore";

// IPFS URIs for different ship states
const UNCONSTRUCTED_IMAGE =
  "ipfs://bafkreibc3fdrdsw4l7zy4wjrgalvfhg6kfd3wmijwefny3nxj5244x2tr4";
const DESTROYED_IMAGE =
  "ipfs://bafkreige3z6iopsmgyzefidhydbaikpipxwrstqzuylw2y2c4rvwnn6yvm";

// Base SVG template with viewBox and dimensions
const BASE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">';
const SVG_END = "</svg>";

/**
 * Renders a ship to an SVG data URI
 * @param ship The ship to render
 * @returns Data URI string (data:image/svg+xml;base64,...)
 */
export function renderShip(ship: Ship): string {
  // Return appropriate image URI based on ship state
  if (ship.shipData.timestampDestroyed > BigInt(0)) {
    return DESTROYED_IMAGE;
  } else if (!ship.shipData.constructed) {
    return UNCONSTRUCTED_IMAGE;
  }

  // For constructed and non-destroyed ships, render the SVG
  let svg = BASE_SVG;

  // Call each renderer in sequence from bottom to top
  svg += renderSpecial(ship); // Special effects (bottom)
  svg += renderAft(ship); // Aft section
  svg += renderWeapon(ship); // Weapons
  svg += renderBody(ship); // Body
  svg += renderFore(ship); // Fore section (top)

  // Close the SVG
  svg += SVG_END;

  // Convert SVG to base64 data URI
  const base64Svg = btoa(svg);
  return `data:image/svg+xml;base64,${base64Svg}`;
}
