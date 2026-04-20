import type { Grid, SymmetrySourceSide } from "@/types/game";

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]) as Grid;
}

export function createEmptyGrid(size: number): Grid {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0 as 0 | 1 | 2)
  );
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  if (a.length !== b.length) return false;

  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;

    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }

  return true;
}

export function toggleCell(grid: Grid, row: number, col: number): Grid {
  const next = cloneGrid(grid);
  next[row][col] = next[row][col] === 1 ? 0 : 1;
  return next;
}

export function setCell(grid: Grid, row: number, col: number, value: 0 | 1 | 2): Grid {
  const next = cloneGrid(grid);
  next[row][col] = value;
  return next;
}

export function rotate90CW(grid: Grid): Grid {
  const n = grid.length;
  const next = createEmptyGrid(n);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      next[c][n - 1 - r] = grid[r][c];
    }
  }

  return next;
}

export function rotate90CCW(grid: Grid): Grid {
  const n = grid.length;
  const next = createEmptyGrid(n);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      next[n - 1 - c][r] = grid[r][c];
    }
  }

  return next;
}

export function rotate180(grid: Grid): Grid {
  return rotate90CW(rotate90CW(grid));
}

export function flipX(grid: Grid): Grid {
  return [...grid].reverse().map((row) => [...row]) as Grid;
}

export function flipY(grid: Grid): Grid {
  return grid.map((row) => [...row].reverse()) as Grid;
}

export function reflectVertical(grid: Grid): Grid {
  const size = grid.length;
  const next = createEmptyGrid(size);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 1) {
        next[r][c] = 1;
        next[r][size - 1 - c] = 1;
      }
    }
  }

  return next;
}

export function reflectHorizontal(grid: Grid): Grid {
  const size = grid.length;
  const next = createEmptyGrid(size);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 1) {
        next[r][c] = 1;
        next[size - 1 - r][c] = 1;
      }
    }
  }

  return next;
}

export function keepLeftHalf(grid: Grid): Grid {
  const size = grid.length;
  const next = createEmptyGrid(size);
  const cutoff = Math.ceil(size / 2);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < cutoff; c++) {
      next[r][c] = grid[r][c];
    }
  }

  return next;
}

export function keepRightHalf(grid: Grid): Grid {
  const size = grid.length;
  const next = createEmptyGrid(size);
  const cutoff = Math.floor(size / 2);

  for (let r = 0; r < size; r++) {
    for (let c = cutoff; c < size; c++) {
      next[r][c] = grid[r][c];
    }
  }

  return next;
}

export function keepTopHalf(grid: Grid): Grid {
  const size = grid.length;
  const next = createEmptyGrid(size);
  const cutoff = Math.ceil(size / 2);

  for (let r = 0; r < cutoff; r++) {
    for (let c = 0; c < size; c++) {
      next[r][c] = grid[r][c];
    }
  }

  return next;
}

export function keepBottomHalf(grid: Grid): Grid {
  const size = grid.length;
  const next = createEmptyGrid(size);
  const cutoff = Math.floor(size / 2);

  for (let r = cutoff; r < size; r++) {
    for (let c = 0; c < size; c++) {
      next[r][c] = grid[r][c];
    }
  }

  return next;
}

export function buildSymmetryStartGrid(
  targetGrid: Grid,
  side: SymmetrySourceSide
): Grid {
  switch (side) {
    case "left":
      return keepLeftHalf(targetGrid);
    case "right":
      return keepRightHalf(targetGrid);
    case "top":
      return keepTopHalf(targetGrid);
    case "bottom":
      return keepBottomHalf(targetGrid);
  }
}

export function isSymmetryCellEditable(
  size: number,
  side: SymmetrySourceSide,
  row: number,
  col: number
): boolean {
  switch (side) {
    case "left":
      return col >= Math.ceil(size / 2);
    case "right":
      return col < Math.floor(size / 2);
    case "top":
      return row >= Math.ceil(size / 2);
    case "bottom":
      return row < Math.floor(size / 2);
  }
}
