import defaultMap from "../../public/default_map.json";
import {
  buildMapGridsFromDefaultMap,
  type DefaultMapShape,
} from "./mapGridUtils";
import { GRID_DIMENSIONS } from "../types/types";

const { scoringGrid } = buildMapGridsFromDefaultMap(
  defaultMap as DefaultMapShape,
  GRID_DIMENSIONS.WIDTH,
  GRID_DIMENSIONS.HEIGHT,
);

/** Scoring points for the tutorial default map at (row, col); 0 if not a zone. */
export function tutorialDefaultScoringPoints(row: number, col: number): number {
  return scoringGrid[row]?.[col] ?? 0;
}
