/**
 * Shared utilities to build blockedGrid, scoringGrid, and onlyOnceGrid
 * from either the default_map.json shape (tutorial) or contract map data (real games).
 * Ensures the same grid format is used everywhere.
 */

export interface MapGrids {
  blockedGrid: boolean[][];
  scoringGrid: number[][];
  onlyOnceGrid: boolean[][];
}

/** Default map JSON shape (e.g. public/default_map.json) */
export interface DefaultMapShape {
  gridDimensions?: { WIDTH: number; HEIGHT: number };
  blockedTiles?: boolean[][];
  scoringTiles?: number[][];
  onlyOnceTiles?: boolean[][];
}

/**
 * Build map grids from the default_map.json format (tutorial).
 */
export function buildMapGridsFromDefaultMap(
  defaultMap: DefaultMapShape,
  width: number,
  height: number
): MapGrids {
  const blockedGrid = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));
  const scoringGrid = Array(height)
    .fill(null)
    .map(() => Array(width).fill(0));
  const onlyOnceGrid = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  if (defaultMap.blockedTiles && Array.isArray(defaultMap.blockedTiles)) {
    defaultMap.blockedTiles.forEach((row, rowIndex) => {
      if (Array.isArray(row) && rowIndex < height) {
        row.forEach((isBlocked, colIndex) => {
          if (isBlocked && colIndex < width) {
            blockedGrid[rowIndex][colIndex] = true;
          }
        });
      }
    });
  }

  if (defaultMap.scoringTiles && Array.isArray(defaultMap.scoringTiles)) {
    defaultMap.scoringTiles.forEach((row, rowIndex) => {
      if (Array.isArray(row) && rowIndex < height) {
        row.forEach((points, colIndex) => {
          if (points > 0 && colIndex < width) {
            scoringGrid[rowIndex][colIndex] = points;
          }
        });
      }
    });
  }

  if (defaultMap.onlyOnceTiles && Array.isArray(defaultMap.onlyOnceTiles)) {
    defaultMap.onlyOnceTiles.forEach((row, rowIndex) => {
      if (Array.isArray(row) && rowIndex < height) {
        row.forEach((onlyOnce, colIndex) => {
          if (onlyOnce && colIndex < width) {
            onlyOnceGrid[rowIndex][colIndex] = true;
          }
        });
      }
    });
  }

  return { blockedGrid, scoringGrid, onlyOnceGrid };
}

/** Contract map format: blocked positions and scoring positions from chain */
export type ContractBlockedPositions = Array<{ row: number; col: number }>;
export type ContractScoringPositions = Array<{
  row: number;
  col: number;
  points: number;
  onlyOnce: boolean;
}>;

/**
 * Build map grids from contract map data (real games).
 */
export function buildMapGridsFromContractMap(
  blockedPositions: ContractBlockedPositions | undefined,
  scoringPositions: ContractScoringPositions | undefined,
  width: number,
  height: number
): MapGrids {
  const blockedGrid = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));
  const scoringGrid = Array(height)
    .fill(null)
    .map(() => Array(width).fill(0));
  const onlyOnceGrid = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  if (blockedPositions && Array.isArray(blockedPositions)) {
    blockedPositions.forEach((pos: { row: number; col: number }) => {
      if (
        pos.row >= 0 &&
        pos.row < height &&
        pos.col >= 0 &&
        pos.col < width
      ) {
        blockedGrid[pos.row][pos.col] = true;
      }
    });
  }

  if (scoringPositions && Array.isArray(scoringPositions)) {
    scoringPositions.forEach(
      (pos: {
        row: number;
        col: number;
        points: number;
        onlyOnce: boolean;
      }) => {
        if (
          pos.row >= 0 &&
          pos.row < height &&
          pos.col >= 0 &&
          pos.col < width
        ) {
          scoringGrid[pos.row][pos.col] = pos.points;
          if (pos.onlyOnce) {
            onlyOnceGrid[pos.row][pos.col] = true;
          }
        }
      }
    );
  }

  return { blockedGrid, scoringGrid, onlyOnceGrid };
}
