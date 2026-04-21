import type { Grid, Level, SymmetryKind, SymmetrySourceSide } from "@/types/game";
import {
  buildSymmetryStartGrid,
  createEmptyGrid,
  flipX,
  flipY,
  reflectHorizontal,
  reflectVertical,
  rotate180,
  rotate90CCW,
  rotate90CW,
} from "@/lib/board";

type TransformKind =
  | "rotate90cw"
  | "rotate90ccw"
  | "rotate180"
  | "flipX"
  | "flipY";

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]) as Grid;
}

function applyTransform(grid: Grid, transform: TransformKind): Grid {
  switch (transform) {
    case "rotate90cw":
      return rotate90CW(grid);
    case "rotate90ccw":
      return rotate90CCW(grid);
    case "rotate180":
      return rotate180(grid);
    case "flipX":
      return flipX(grid);
    case "flipY":
      return flipY(grid);
  }
}

function applyTransformSequence(grid: Grid, transforms: TransformKind[]): Grid {
  return transforms.reduce((current, transform) => {
    return applyTransform(current, transform);
  }, cloneGrid(grid));
}

function transformPrompt(transform: TransformKind): string {
  switch (transform) {
    case "rotate90cw":
      return "Build the result after rotating the source pattern 90° clockwise.";
    case "rotate90ccw":
      return "Build the result after rotating the source pattern 90° counterclockwise.";
    case "rotate180":
      return "Build the result after rotating the source pattern 180°.";
    case "flipX":
      return "Build the result after flipping the source pattern across the X-axis.";
    case "flipY":
      return "Build the result after flipping the source pattern across the Y-axis.";
  }
}

function transformInstructionLabel(transform: TransformKind): string {
  switch (transform) {
    case "rotate90cw":
      return "rotate the source pattern 90° clockwise";
    case "rotate90ccw":
      return "rotate the source pattern 90° counterclockwise";
    case "rotate180":
      return "rotate the source pattern 180°";
    case "flipX":
      return "flip the source pattern across the X-axis";
    case "flipY":
      return "flip the source pattern across the Y-axis";
  }
}

function multiTransformPrompt(transforms: TransformKind[]): string {
  if (transforms.length === 1) {
    return `Build the result after ${transformInstructionLabel(transforms[0])}.`;
  }

  const [first, ...rest] = transforms;
  const restText = rest.map((t) => {
    switch (t) {
      case "rotate90cw":
        return "then rotate it 90° clockwise";
      case "rotate90ccw":
        return "then rotate it 90° counterclockwise";
      case "rotate180":
        return "then rotate it 180°";
      case "flipX":
        return "then flip it across the X-axis";
      case "flipY":
        return "then flip it across the Y-axis";
    }
  });

  return `Build the result after ${transformInstructionLabel(first)}, ${restText.join(
    ", "
  )}.`;
}

function symmetryPrompt(kind: SymmetryKind): string {
  switch (kind) {
    case "vertical":
      return "Complete the board so it becomes left-right symmetrical.";
    case "horizontal":
      return "Complete the board so it becomes top-bottom symmetrical.";
  }
}

function applySymmetry(grid: Grid, kind: SymmetryKind): Grid {
  switch (kind) {
    case "vertical":
      return reflectVertical(grid);
    case "horizontal":
      return reflectHorizontal(grid);
  }
}

function makeTransformLevel(
  id: number,
  source: Grid,
  transform: TransformKind
): Level {
  return {
    id,
    type: "transform",
    size: source.length,
    prompt: transformPrompt(transform),
    startGrid: cloneGrid(source),
    targetGrid: applyTransform(cloneGrid(source), transform),
  };
}

function makeChromaticTransformLevel(
  id: number,
  source: Grid,
  transform: TransformKind
): Level {
  return {
    id,
    type: "chromatic",
    size: source.length,
    prompt: `Build the result after ${transformInstructionLabel(
      transform
    )}, keeping both colors in the correct positions.`,
    startGrid: cloneGrid(source),
    targetGrid: applyTransform(cloneGrid(source), transform),
  };
}

function makeChromaticMultiTransformLevel(
  id: number,
  source: Grid,
  transforms: TransformKind[]
): Level {
  return {
    id,
    type: "chromatic",
    size: source.length,
    prompt: `${multiTransformPrompt(transforms).replace(
      "Build the result after ",
      "Build the two-color result after "
    )} Keep each color on the correct tile.`,
    startGrid: cloneGrid(source),
    targetGrid: applyTransformSequence(cloneGrid(source), transforms),
  };
}

function makeMultiTransformLevel(
  id: number,
  source: Grid,
  transforms: TransformKind[]
): Level {
  return {
    id,
    type: "transform",
    size: source.length,
    prompt: multiTransformPrompt(transforms),
    startGrid: cloneGrid(source),
    targetGrid: applyTransformSequence(cloneGrid(source), transforms),
  };
}

function makeMemoryLevel(id: number, target: Grid, memoryPreviewMs: number): Level {
  return {
    id,
    type: "memory",
    size: target.length,
    prompt: "Memorize the pattern, then rebuild it.",
    startGrid: createEmptyGrid(target.length),
    targetGrid: cloneGrid(target),
    memoryPreviewMs,
  };
}

function makeSymmetryLevel(
  id: number,
  seed: Grid,
  symmetryKind: SymmetryKind,
  sourceSide: SymmetrySourceSide
): Level {
  const targetGrid = applySymmetry(seed, symmetryKind);
  const startGrid = buildSymmetryStartGrid(targetGrid, sourceSide);

  return {
    id,
    type: "symmetry",
    size: seed.length,
    prompt: symmetryPrompt(symmetryKind),
    startGrid,
    targetGrid,
    symmetryKind,
    symmetrySourceSide: sourceSide,
  };
}

/* =========================
   4x4 patterns
========================= */

const T4A: Grid = [
  [0, 1, 0, 0],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [0, 0, 0, 0],
];

const T4B: Grid = [
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [1, 0, 1, 0],
  [0, 0, 0, 0],
];

const T4C: Grid = [
  [0, 1, 1, 0],
  [0, 1, 0, 0],
  [1, 1, 0, 0],
  [0, 0, 0, 0],
];

const T4D: Grid = [
  [0, 1, 0, 0],
  [0, 1, 1, 0],
  [1, 1, 0, 0],
  [0, 0, 0, 0],
];

const T4E: Grid = [
  [1, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 1, 0],
  [0, 0, 0, 0],
];

const C5A: Grid = [
  [1, 0, 2, 0, 0],
  [0, 1, 0, 2, 0],
  [2, 0, 1, 0, 1],
  [0, 2, 0, 1, 0],
  [0, 0, 1, 0, 2],
];

const C5B: Grid = [
  [0, 2, 0, 1, 0],
  [1, 0, 2, 0, 1],
  [0, 1, 0, 2, 0],
  [2, 0, 1, 0, 2],
  [0, 1, 0, 2, 0],
];

const C5C: Grid = [
  [1, 1, 0, 2, 0],
  [0, 2, 0, 1, 2],
  [2, 0, 1, 0, 0],
  [0, 1, 2, 0, 1],
  [0, 0, 1, 2, 0],
];

const C5D: Grid = [
  [2, 0, 1, 0, 2],
  [0, 1, 0, 2, 0],
  [1, 0, 2, 0, 1],
  [0, 2, 0, 1, 0],
  [2, 0, 1, 0, 2],
];

const C5E: Grid = [
  [0, 1, 0, 2, 1],
  [2, 0, 1, 0, 0],
  [0, 2, 0, 1, 2],
  [1, 0, 2, 0, 1],
  [0, 1, 0, 2, 0],
];

const C5F: Grid = [
  [1, 0, 0, 2, 0],
  [0, 2, 1, 0, 1],
  [2, 0, 2, 0, 0],
  [0, 1, 0, 2, 1],
  [1, 0, 1, 0, 2],
];

const C5G: Grid = [
  [0, 2, 1, 0, 1],
  [1, 0, 0, 2, 0],
  [0, 1, 2, 0, 2],
  [2, 0, 1, 0, 0],
  [0, 2, 0, 1, 2],
];

const C5H: Grid = [
  [2, 1, 0, 0, 1],
  [0, 0, 2, 1, 0],
  [1, 2, 0, 2, 0],
  [0, 1, 0, 0, 2],
  [2, 0, 1, 0, 1],
];

const C5I: Grid = [
  [1, 0, 2, 1, 0],
  [0, 2, 0, 0, 2],
  [1, 0, 1, 2, 0],
  [0, 1, 0, 0, 1],
  [2, 0, 2, 1, 0],
];

const C5J: Grid = [
  [0, 1, 2, 0, 2],
  [2, 0, 0, 1, 0],
  [0, 2, 1, 0, 1],
  [1, 0, 2, 0, 0],
  [0, 1, 0, 2, 1],
];

const C4A: Grid = [
  [1, 0, 2, 0],
  [0, 1, 0, 2],
  [2, 0, 1, 0],
  [0, 2, 0, 1],
];

const C4B: Grid = [
  [0, 2, 0, 1],
  [1, 0, 2, 0],
  [0, 1, 0, 2],
  [2, 0, 1, 0],
];

const C4C: Grid = [
  [1, 1, 0, 2],
  [0, 2, 0, 1],
  [2, 0, 1, 0],
  [0, 1, 2, 0],
];

const C4D: Grid = [
  [2, 0, 1, 0],
  [0, 1, 0, 2],
  [1, 0, 2, 0],
  [0, 2, 0, 1],
];

const C4E: Grid = [
  [0, 1, 0, 2],
  [2, 0, 1, 0],
  [0, 2, 0, 1],
  [1, 0, 2, 0],
];

const C4F: Grid = [
  [2, 1, 0, 1],
  [0, 0, 2, 0],
  [1, 2, 0, 2],
  [0, 1, 0, 1],
];

const T6A: Grid = [
  [0, 1, 1, 0, 0, 0],
  [1, 1, 0, 0, 1, 0],
  [0, 1, 0, 1, 1, 0],
  [0, 0, 1, 1, 0, 0],
  [1, 0, 1, 0, 1, 0],
  [0, 0, 0, 1, 0, 0],
];

const T6B: Grid = [
  [1, 0, 0, 1, 0, 0],
  [1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 0],
  [0, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0],
];

const T6C: Grid = [
  [0, 1, 0, 0, 1, 0],
  [1, 1, 1, 0, 0, 0],
  [0, 1, 0, 1, 1, 0],
  [0, 0, 1, 1, 0, 1],
  [1, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 1, 0],
];

const T6D: Grid = [
  [1, 1, 0, 0, 0, 1],
  [0, 1, 0, 1, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [0, 1, 1, 0, 0, 1],
  [0, 0, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
];

const T6E: Grid = [
  [0, 0, 1, 0, 1, 0],
  [1, 1, 1, 0, 0, 1],
  [0, 1, 0, 1, 0, 0],
  [1, 0, 1, 1, 0, 0],
  [0, 1, 0, 0, 1, 0],
  [0, 0, 1, 0, 1, 1],
];

const T6F: Grid = [
  [1, 0, 1, 0, 0, 1],
  [0, 1, 1, 1, 0, 0],
  [0, 0, 1, 0, 1, 0],
  [1, 1, 0, 1, 0, 0],
  [0, 1, 0, 0, 1, 1],
  [0, 0, 1, 0, 0, 1],
];

const T4F: Grid = [
  [0, 1, 0, 1],
  [0, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 0],
];

const T4G: Grid = [
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 0],
];

const T4H: Grid = [
  [0, 1, 0, 0],
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 0],
];

const T4I: Grid = [
  [1, 0, 0, 1],
  [1, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 0],
];

const T4J: Grid = [
  [0, 1, 1, 0],
  [1, 0, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 0],
];

const T4K: Grid = [
  [1, 1, 0, 0],
  [1, 0, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 0],
];

const T4L: Grid = [
  [0, 0, 1, 0],
  [1, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 0],
];

const T4M: Grid = [
  [1, 0, 1, 0],
  [1, 1, 0, 1],
  [0, 1, 1, 0],
  [0, 0, 1, 0],
];

const T4N: Grid = [
  [0, 1, 1, 0],
  [1, 0, 1, 1],
  [1, 1, 0, 0],
  [0, 1, 0, 0],
];

const T4O: Grid = [
  [1, 1, 0, 1],
  [0, 1, 1, 0],
  [1, 0, 1, 0],
  [0, 0, 1, 0],
];

const T4P: Grid = [
  [0, 1, 0, 1],
  [1, 1, 1, 0],
  [0, 1, 0, 1],
  [0, 0, 1, 0],
];

const T4Q: Grid = [
  [1, 0, 1, 0],
  [0, 1, 1, 1],
  [1, 1, 0, 0],
  [0, 1, 0, 0],
];

const T4R: Grid = [
  [0, 1, 1, 1],
  [1, 0, 1, 0],
  [0, 1, 1, 0],
  [1, 0, 0, 0],
];

const T4S: Grid = [
  [1, 0, 0, 1],
  [1, 1, 1, 0],
  [0, 1, 0, 1],
  [0, 0, 1, 0],
];

const T4T: Grid = [
  [0, 1, 0, 1],
  [1, 0, 1, 1],
  [0, 1, 1, 0],
  [1, 0, 0, 0],
];

const M4A: Grid = [
  [0, 1, 0, 1],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [0, 0, 1, 0],
];

const M4B: Grid = [
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [0, 1, 0, 1],
  [0, 0, 1, 1],
];

const M4C: Grid = [
  [0, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 0, 0],
  [0, 0, 0, 1],
];

const M4D: Grid = [
  [1, 0, 0, 1],
  [0, 1, 1, 0],
  [1, 1, 0, 0],
  [0, 1, 0, 0],
];

const M4E: Grid = [
  [0, 1, 0, 0],
  [1, 1, 1, 0],
  [0, 1, 0, 1],
  [1, 0, 0, 0],
];

const M4F: Grid = [
  [1, 1, 0, 1],
  [0, 1, 0, 0],
  [1, 1, 1, 0],
  [0, 0, 1, 0],
];

const M4G: Grid = [
  [0, 1, 1, 0],
  [1, 0, 0, 1],
  [0, 1, 1, 0],
  [1, 0, 0, 0],
];

const M4H: Grid = [
  [1, 0, 1, 1],
  [0, 1, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 0, 0],
];

const M4I: Grid = [
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
];

const M4J: Grid = [
  [1, 1, 0, 1],
  [0, 1, 1, 0],
  [1, 0, 1, 1],
  [0, 1, 0, 0],
];

const M4K: Grid = [
  [0, 1, 1, 0],
  [1, 1, 0, 1],
  [0, 1, 1, 0],
  [1, 0, 1, 0],
];

const M4L: Grid = [
  [1, 0, 1, 1],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [1, 0, 0, 1],
];

const M4M: Grid = [
  [0, 1, 0, 1],
  [1, 1, 1, 0],
  [1, 0, 1, 1],
  [0, 1, 0, 0],
];

const M4N: Grid = [
  [1, 1, 0, 0],
  [0, 1, 1, 1],
  [1, 0, 1, 0],
  [0, 1, 0, 1],
];

const S4A: Grid = [
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 0],
];

const S4B: Grid = [
  [0, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

const S4C: Grid = [
  [0, 0, 1, 0],
  [0, 1, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 0],
];

const S4D: Grid = [
  [0, 0, 0, 0],
  [1, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 0],
];

const S4E: Grid = [
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [0, 0, 0, 0],
];

const S4F: Grid = [
  [0, 1, 0, 0],
  [0, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 0],
];

const S4G: Grid = [
  [1, 0, 1, 0],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [0, 0, 0, 0],
];

const S4H: Grid = [
  [0, 1, 0, 0],
  [1, 1, 0, 1],
  [0, 1, 1, 0],
  [0, 0, 0, 0],
];

const S4I: Grid = [
  [0, 0, 1, 0],
  [1, 0, 1, 0],
  [0, 1, 1, 0],
  [0, 0, 0, 0],
];

const S4J: Grid = [
  [0, 1, 0, 0],
  [0, 1, 1, 0],
  [1, 0, 1, 0],
  [0, 0, 0, 0],
];

/* =========================
   5x5 patterns
========================= */

const T5A: Grid = [
  [0, 0, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 1, 0],
  [0, 0, 0, 0, 0],
];

const T5B: Grid = [
  [0, 1, 0, 0, 0],
  [1, 1, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 1, 0],
  [0, 0, 0, 0, 0],
];

const T5C: Grid = [
  [1, 0, 0, 0, 0],
  [1, 1, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const T5D: Grid = [
  [0, 1, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [1, 1, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const T5E: Grid = [
  [0, 0, 1, 0, 1],
  [0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0],
  [0, 1, 0, 1, 0],
  [0, 0, 0, 0, 0],
];

const T5F: Grid = [
  [1, 0, 1, 0, 0],
  [1, 1, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 1, 0],
  [0, 0, 0, 0, 0],
];

const T5G: Grid = [
  [0, 1, 0, 1, 0],
  [1, 1, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const T5H: Grid = [
  [1, 0, 0, 1, 0],
  [1, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0],
  [0, 0, 0, 0, 0],
];

const T5I: Grid = [
  [1, 0, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [1, 1, 0, 0, 1],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
];

const T5J: Grid = [
  [0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0],
  [0, 1, 1, 0, 0],
  [1, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
];

const T5K: Grid = [
  [1, 1, 0, 1, 0],
  [0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
];

const T5L: Grid = [
  [0, 1, 0, 1, 1],
  [1, 1, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [1, 0, 1, 1, 0],
  [0, 0, 0, 1, 0],
];

const T5M: Grid = [
  [1, 0, 0, 1, 0],
  [1, 1, 1, 0, 1],
  [0, 1, 0, 1, 0],
  [1, 0, 1, 1, 0],
  [0, 1, 0, 0, 0],
];

const T5N: Grid = [
  [0, 1, 1, 0, 0],
  [1, 0, 1, 1, 0],
  [1, 1, 0, 0, 1],
  [0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0],
];

const T5O: Grid = [
  [1, 0, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [1, 0, 1, 0, 0],
  [0, 1, 0, 1, 1],
  [0, 0, 1, 0, 0],
];

const T5P: Grid = [
  [0, 1, 0, 1, 0],
  [1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1],
  [1, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
];

const M5A: Grid = [
  [0, 1, 0, 0, 1],
  [1, 1, 0, 1, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
  [1, 0, 0, 0, 0],
];

const M5B: Grid = [
  [0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0],
  [1, 1, 0, 1, 0],
  [0, 1, 0, 1, 1],
  [0, 0, 1, 0, 0],
];

const M5C: Grid = [
  [1, 0, 1, 0, 0],
  [0, 1, 1, 0, 1],
  [1, 1, 0, 1, 0],
  [0, 1, 0, 0, 1],
  [0, 0, 1, 0, 0],
];

const M5D: Grid = [
  [0, 1, 0, 1, 0],
  [1, 1, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 1],
  [0, 0, 0, 1, 0],
];

const M5E: Grid = [
  [1, 0, 0, 1, 0],
  [1, 1, 0, 0, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
  [1, 0, 0, 0, 0],
];

const M5F: Grid = [
  [0, 1, 1, 0, 0],
  [1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1],
  [1, 0, 0, 1, 0],
  [0, 0, 1, 0, 0],
];

const M5G: Grid = [
  [1, 0, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [1, 0, 1, 0, 0],
  [0, 1, 0, 1, 1],
  [0, 0, 1, 0, 0],
];

const M5H: Grid = [
  [0, 1, 1, 0, 1],
  [1, 1, 0, 1, 0],
  [0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0],
  [0, 1, 0, 0, 1],
];

const M5I: Grid = [
  [1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1],
  [1, 1, 0, 1, 0],
  [0, 1, 0, 1, 1],
  [1, 0, 0, 1, 0],
];

const M5J: Grid = [
  [0, 1, 0, 1, 1],
  [1, 0, 1, 1, 0],
  [1, 1, 0, 0, 1],
  [0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0],
];

const M5K: Grid = [
  [1, 1, 0, 1, 0],
  [0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0],
  [0, 1, 0, 1, 1],
  [1, 0, 1, 0, 0],
];

const M5L: Grid = [
  [0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0],
  [1, 1, 0, 1, 0],
  [0, 1, 1, 0, 1],
  [1, 0, 0, 1, 0],
];

const S5A: Grid = [
  [1, 0, 0, 0, 0],
  [1, 1, 0, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5B: Grid = [
  [0, 1, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5C: Grid = [
  [0, 0, 1, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5D: Grid = [
  [0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5E: Grid = [
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 0, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5F: Grid = [
  [0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5G: Grid = [
  [1, 0, 1, 0, 0],
  [1, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5H: Grid = [
  [0, 1, 0, 0, 0],
  [1, 1, 0, 1, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5I: Grid = [
  [0, 0, 1, 0, 0],
  [1, 0, 1, 0, 0],
  [0, 1, 1, 0, 0],
  [1, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5J: Grid = [
  [0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [1, 0, 1, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5K: Grid = [
  [1, 0, 0, 1, 0],
  [1, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [1, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
];

const S5L: Grid = [
  [0, 1, 1, 0, 0],
  [1, 0, 1, 0, 0],
  [0, 1, 1, 0, 0],
  [1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

/* =========================
   Level assembly
========================= */

const first50_4x4: Level[] = [
  makeTransformLevel(1, T4A, "rotate90cw"),
  makeTransformLevel(2, T4B, "flipY"),
  makeMemoryLevel(3, M4A, 2400),
  makeSymmetryLevel(4, S4A, "vertical", "left"),
  makeTransformLevel(5, T4C, "rotate180"),
  makeMemoryLevel(6, M4B, 2300),
  makeSymmetryLevel(7, S4B, "horizontal", "top"),
  makeTransformLevel(8, T4D, "flipX"),
  makeMemoryLevel(9, M4C, 2200),
  makeSymmetryLevel(10, S4C, "vertical", "right"),

  makeTransformLevel(11, T4E, "rotate90cw"),
  makeMemoryLevel(12, M4D, 2150),
  makeSymmetryLevel(13, S4D, "horizontal", "bottom"),
  makeTransformLevel(14, T4F, "rotate90ccw"),
  makeMemoryLevel(15, M4E, 2100),
  makeTransformLevel(16, T4G, "flipY"),
  makeSymmetryLevel(17, S4E, "vertical", "left"),
  makeMemoryLevel(18, M4F, 2050),
  makeTransformLevel(19, T4H, "rotate180"),
  makeSymmetryLevel(20, S4F, "horizontal", "top"),

  makeMemoryLevel(21, M4G, 2000),
  makeTransformLevel(22, T4I, "flipX"),
  makeSymmetryLevel(23, S4A, "horizontal", "bottom"),
  makeMemoryLevel(24, M4H, 1950),
  makeTransformLevel(25, T4J, "rotate90cw"),
  makeTransformLevel(26, T4K, "rotate90ccw"),
  makeSymmetryLevel(27, S4B, "vertical", "right"),
  makeMemoryLevel(28, M4A, 1900),
  makeTransformLevel(29, T4L, "flipY"),
  makeMemoryLevel(30, M4B, 1850),

  makeSymmetryLevel(31, S4C, "horizontal", "top"),
  makeTransformLevel(32, T4A, "flipX"),
  makeMemoryLevel(33, M4C, 1800),
  makeSymmetryLevel(34, S4D, "vertical", "left"),
  makeTransformLevel(35, T4B, "rotate180"),
  makeMemoryLevel(36, M4D, 1750),
  makeSymmetryLevel(37, S4E, "horizontal", "bottom"),
  makeTransformLevel(38, T4C, "flipY"),
  makeMemoryLevel(39, M4E, 1700),
  makeSymmetryLevel(40, S4F, "vertical", "right"),

  makeTransformLevel(41, T4D, "rotate90cw"),
  makeMemoryLevel(42, M4F, 1650),
  makeSymmetryLevel(43, S4A, "horizontal", "top"),
  makeTransformLevel(44, T4E, "flipX"),
  makeMemoryLevel(45, M4G, 1600),
  makeSymmetryLevel(46, S4B, "vertical", "left"),
  makeTransformLevel(47, T4F, "rotate180"),
  makeMemoryLevel(48, M4H, 1550),
  makeSymmetryLevel(49, S4C, "horizontal", "bottom"),
  makeTransformLevel(50, T4G, "flipY"),
];

const second50_4x4: Level[] = [
  makeTransformLevel(51, T4M, "rotate90cw"),
  makeMemoryLevel(52, M4I, 1500),
  makeSymmetryLevel(53, S4G, "vertical", "left"),
  makeTransformLevel(54, T4N, "flipY"),
  makeMemoryLevel(55, M4J, 1480),
  makeSymmetryLevel(56, S4H, "horizontal", "top"),
  makeTransformLevel(57, T4O, "rotate180"),
  makeMemoryLevel(58, M4K, 1460),
  makeSymmetryLevel(59, S4I, "vertical", "right"),
  makeTransformLevel(60, T4P, "rotate90ccw"),

  makeMemoryLevel(61, M4L, 1440),
  makeSymmetryLevel(62, S4J, "horizontal", "bottom"),
  makeTransformLevel(63, T4Q, "flipX"),
  makeMemoryLevel(64, M4M, 1420),
  makeSymmetryLevel(65, S4G, "horizontal", "top"),
  makeTransformLevel(66, T4R, "flipY"),
  makeMemoryLevel(67, M4N, 1400),
  makeSymmetryLevel(68, S4H, "vertical", "left"),
  makeTransformLevel(69, T4S, "rotate180"),
  makeMemoryLevel(70, M4I, 1380),

  makeSymmetryLevel(71, S4I, "horizontal", "bottom"),
  makeTransformLevel(72, T4T, "rotate90cw"),
  makeMemoryLevel(73, M4J, 1360),
  makeSymmetryLevel(74, S4J, "vertical", "right"),
  makeTransformLevel(75, T4M, "flipX"),
  makeMemoryLevel(76, M4K, 1340),
  makeSymmetryLevel(77, S4G, "vertical", "left"),
  makeTransformLevel(78, T4N, "rotate90ccw"),
  makeMemoryLevel(79, M4L, 1320),
  makeSymmetryLevel(80, S4H, "horizontal", "top"),

  makeTransformLevel(81, T4O, "flipY"),
  makeMemoryLevel(82, M4M, 1300),
  makeSymmetryLevel(83, S4I, "vertical", "right"),
  makeTransformLevel(84, T4P, "rotate180"),
  makeMemoryLevel(85, M4N, 1280),
  makeSymmetryLevel(86, S4J, "horizontal", "bottom"),
  makeTransformLevel(87, T4Q, "rotate90cw"),
  makeMemoryLevel(88, M4I, 1260),
  makeSymmetryLevel(89, S4G, "horizontal", "top"),
  makeTransformLevel(90, T4R, "flipX"),

  makeMemoryLevel(91, M4J, 1240),
  makeSymmetryLevel(92, S4H, "vertical", "left"),
  makeTransformLevel(93, T4S, "rotate90ccw"),
  makeMemoryLevel(94, M4K, 1220),
  makeSymmetryLevel(95, S4I, "horizontal", "bottom"),
  makeTransformLevel(96, T4T, "flipY"),
  makeMemoryLevel(97, M4L, 1200),
  makeSymmetryLevel(98, S4J, "vertical", "right"),
  makeTransformLevel(99, T4M, "rotate180"),
  makeMemoryLevel(100, M4M, 1180),
];

const hundred_5x5: Level[] = [
  makeTransformLevel(101, T5A, "rotate90cw"),
  makeMemoryLevel(102, M5A, 2400),
  makeSymmetryLevel(103, S5A, "vertical", "left"),
  makeTransformLevel(104, T5B, "flipY"),
  makeMemoryLevel(105, M5B, 2360),
  makeSymmetryLevel(106, S5B, "horizontal", "top"),
  makeTransformLevel(107, T5C, "rotate180"),
  makeMemoryLevel(108, M5C, 2320),
  makeSymmetryLevel(109, S5C, "vertical", "right"),
  makeTransformLevel(110, T5D, "flipX"),

  makeMemoryLevel(111, M5D, 2280),
  makeSymmetryLevel(112, S5D, "horizontal", "bottom"),
  makeTransformLevel(113, T5E, "rotate90ccw"),
  makeMemoryLevel(114, M5E, 2240),
  makeSymmetryLevel(115, S5E, "vertical", "left"),
  makeTransformLevel(116, T5F, "rotate90cw"),
  makeMemoryLevel(117, M5F, 2200),
  makeSymmetryLevel(118, S5F, "horizontal", "top"),
  makeTransformLevel(119, T5G, "flipY"),
  makeMemoryLevel(120, M5A, 2160),

  makeSymmetryLevel(121, S5A, "horizontal", "bottom"),
  makeTransformLevel(122, T5H, "rotate180"),
  makeMemoryLevel(123, M5B, 2120),
  makeSymmetryLevel(124, S5B, "vertical", "right"),
  makeTransformLevel(125, T5A, "flipX"),
  makeMemoryLevel(126, M5C, 2080),
  makeSymmetryLevel(127, S5C, "horizontal", "top"),
  makeTransformLevel(128, T5B, "rotate90cw"),
  makeMemoryLevel(129, M5D, 2040),
  makeSymmetryLevel(130, S5D, "vertical", "left"),

  makeTransformLevel(131, T5C, "flipY"),
  makeMemoryLevel(132, M5E, 2000),
  makeSymmetryLevel(133, S5E, "horizontal", "bottom"),
  makeTransformLevel(134, T5D, "rotate90ccw"),
  makeMemoryLevel(135, M5F, 1960),
  makeSymmetryLevel(136, S5F, "vertical", "right"),
  makeTransformLevel(137, T5E, "rotate180"),
  makeMemoryLevel(138, M5A, 1920),
  makeSymmetryLevel(139, S5A, "vertical", "left"),
  makeTransformLevel(140, T5F, "flipX"),

  makeMemoryLevel(141, M5B, 1880),
  makeSymmetryLevel(142, S5B, "horizontal", "top"),
  makeTransformLevel(143, T5G, "rotate90cw"),
  makeMemoryLevel(144, M5C, 1840),
  makeSymmetryLevel(145, S5C, "vertical", "right"),
  makeTransformLevel(146, T5H, "flipY"),
  makeMemoryLevel(147, M5D, 1800),
  makeSymmetryLevel(148, S5D, "horizontal", "bottom"),
  makeTransformLevel(149, T5I, "rotate180"),
  makeMemoryLevel(150, M5G, 1760),

  makeSymmetryLevel(151, S5G, "vertical", "left"),
  makeTransformLevel(152, T5J, "rotate90cw"),
  makeMemoryLevel(153, M5H, 1720),
  makeSymmetryLevel(154, S5H, "horizontal", "top"),
  makeTransformLevel(155, T5K, "flipX"),
  makeMemoryLevel(156, M5I, 1680),
  makeSymmetryLevel(157, S5I, "vertical", "right"),
  makeTransformLevel(158, T5L, "rotate90ccw"),
  makeMemoryLevel(159, M5J, 1640),
  makeSymmetryLevel(160, S5J, "horizontal", "bottom"),

  makeTransformLevel(161, T5M, "flipY"),
  makeMemoryLevel(162, M5K, 1600),
  makeSymmetryLevel(163, S5K, "vertical", "left"),
  makeTransformLevel(164, T5N, "rotate180"),
  makeMemoryLevel(165, M5L, 1560),
  makeSymmetryLevel(166, S5L, "horizontal", "top"),
  makeTransformLevel(167, T5O, "rotate90cw"),
  makeMemoryLevel(168, M5G, 1520),
  makeSymmetryLevel(169, S5G, "horizontal", "bottom"),
  makeTransformLevel(170, T5P, "flipX"),

  makeMemoryLevel(171, M5H, 1480),
  makeSymmetryLevel(172, S5H, "vertical", "right"),
  makeTransformLevel(173, T5I, "rotate90ccw"),
  makeMemoryLevel(174, M5I, 1440),
  makeSymmetryLevel(175, S5I, "horizontal", "top"),
  makeTransformLevel(176, T5J, "flipY"),
  makeMemoryLevel(177, M5J, 1400),
  makeSymmetryLevel(178, S5J, "vertical", "left"),
  makeTransformLevel(179, T5K, "rotate180"),
  makeMemoryLevel(180, M5K, 1360),

  makeSymmetryLevel(181, S5K, "horizontal", "bottom"),
  makeTransformLevel(182, T5L, "rotate90cw"),
  makeMemoryLevel(183, M5L, 1320),
  makeSymmetryLevel(184, S5L, "vertical", "right"),
  makeTransformLevel(185, T5M, "flipX"),
  makeMemoryLevel(186, M5G, 1280),
  makeSymmetryLevel(187, S5G, "vertical", "left"),
  makeTransformLevel(188, T5N, "rotate90ccw"),
  makeMemoryLevel(189, M5H, 1240),
  makeSymmetryLevel(190, S5H, "horizontal", "top"),

  makeTransformLevel(191, T5O, "flipY"),
  makeMemoryLevel(192, M5I, 1200),
  makeSymmetryLevel(193, S5I, "vertical", "right"),
  makeTransformLevel(194, T5P, "rotate180"),
  makeMemoryLevel(195, M5J, 1160),
  makeSymmetryLevel(196, S5J, "horizontal", "bottom"),
  makeTransformLevel(197, T5I, "rotate90cw"),
  makeMemoryLevel(198, M5K, 1120),
  makeSymmetryLevel(199, S5K, "vertical", "left"),
  makeTransformLevel(200, T5J, "flipX"),
];

const hundred_5x5_advanced: Level[] = [
  makeMultiTransformLevel(201, T5I, ["rotate90cw", "flipX"]),
  makeMemoryLevel(202, M5G, 1100),
  makeSymmetryLevel(203, S5L, "vertical", "right"),
  makeMultiTransformLevel(204, T5J, ["flipY", "rotate180"]),
  makeMemoryLevel(205, M5H, 1080),
  makeSymmetryLevel(206, S5K, "horizontal", "bottom"),
  makeMultiTransformLevel(207, T5K, ["rotate90ccw", "flipX"]),
  makeMemoryLevel(208, M5I, 1060),
  makeSymmetryLevel(209, S5J, "vertical", "left"),
  makeMultiTransformLevel(210, T5L, ["flipX", "rotate90cw"]),

  makeMemoryLevel(211, M5J, 1040),
  makeSymmetryLevel(212, S5I, "horizontal", "top"),
  makeMultiTransformLevel(213, T5M, ["rotate180", "flipY"]),
  makeMemoryLevel(214, M5K, 1020),
  makeSymmetryLevel(215, S5H, "vertical", "right"),
  makeMultiTransformLevel(216, T5N, ["flipY", "rotate90ccw"]),
  makeMemoryLevel(217, M5L, 1000),
  makeSymmetryLevel(218, S5G, "horizontal", "bottom"),
  makeMultiTransformLevel(219, T5O, ["rotate90cw", "rotate180"]),
  makeMemoryLevel(220, M5G, 980),

  makeSymmetryLevel(221, S5F, "vertical", "left"),
  makeMultiTransformLevel(222, T5P, ["flipX", "rotate180"]),
  makeMemoryLevel(223, M5H, 960),
  makeSymmetryLevel(224, S5E, "horizontal", "top"),
  makeMultiTransformLevel(225, T5I, ["rotate90ccw", "flipY"]),
  makeMemoryLevel(226, M5I, 940),
  makeSymmetryLevel(227, S5D, "vertical", "right"),
  makeMultiTransformLevel(228, T5J, ["rotate180", "flipX"]),
  makeMemoryLevel(229, M5J, 920),
  makeSymmetryLevel(230, S5C, "horizontal", "bottom"),

  makeMultiTransformLevel(231, T5K, ["flipY", "rotate90cw"]),
  makeMemoryLevel(232, M5K, 900),
  makeSymmetryLevel(233, S5B, "vertical", "left"),
  makeMultiTransformLevel(234, T5L, ["rotate90cw", "flipY"]),
  makeMemoryLevel(235, M5L, 880),
  makeSymmetryLevel(236, S5A, "horizontal", "top"),
  makeMultiTransformLevel(237, T5M, ["flipX", "rotate90ccw"]),
  makeMemoryLevel(238, M5G, 860),
  makeSymmetryLevel(239, S5L, "vertical", "right"),
  makeMultiTransformLevel(240, T5N, ["rotate180", "rotate90cw"]),

  makeMemoryLevel(241, M5H, 840),
  makeSymmetryLevel(242, S5K, "horizontal", "bottom"),
  makeMultiTransformLevel(243, T5O, ["flipY", "rotate180"]),
  makeMemoryLevel(244, M5I, 820),
  makeSymmetryLevel(245, S5J, "vertical", "left"),
  makeMultiTransformLevel(246, T5P, ["rotate90ccw", "flipX"]),
  makeMemoryLevel(247, M5J, 800),
  makeSymmetryLevel(248, S5I, "horizontal", "top"),
  makeMultiTransformLevel(249, T5I, ["rotate90cw", "flipY"]),
  makeMemoryLevel(250, M5K, 790),

  makeSymmetryLevel(251, S5H, "vertical", "right"),
  makeMultiTransformLevel(252, T5J, ["flipX", "rotate90cw"]),
  makeMemoryLevel(253, M5L, 780),
  makeSymmetryLevel(254, S5G, "horizontal", "bottom"),
  makeMultiTransformLevel(255, T5K, ["rotate180", "flipX"]),
  makeMemoryLevel(256, M5G, 770),
  makeSymmetryLevel(257, S5F, "vertical", "left"),
  makeMultiTransformLevel(258, T5L, ["flipY", "rotate90ccw"]),
  makeMemoryLevel(259, M5H, 760),
  makeSymmetryLevel(260, S5E, "horizontal", "top"),

  makeMultiTransformLevel(261, T5M, ["rotate90cw", "rotate180"]),
  makeMemoryLevel(262, M5I, 750),
  makeSymmetryLevel(263, S5D, "vertical", "right"),
  makeMultiTransformLevel(264, T5N, ["flipX", "rotate180"]),
  makeMemoryLevel(265, M5J, 740),
  makeSymmetryLevel(266, S5C, "horizontal", "bottom"),
  makeMultiTransformLevel(267, T5O, ["rotate90ccw", "flipY"]),
  makeMemoryLevel(268, M5K, 730),
  makeSymmetryLevel(269, S5B, "vertical", "left"),
  makeMultiTransformLevel(270, T5P, ["rotate180", "flipY"]),

  makeMemoryLevel(271, M5L, 720),
  makeSymmetryLevel(272, S5A, "horizontal", "top"),
  makeMultiTransformLevel(273, T5I, ["flipY", "rotate90cw"]),
  makeMemoryLevel(274, M5G, 710),
  makeSymmetryLevel(275, S5L, "vertical", "right"),
  makeMultiTransformLevel(276, T5J, ["rotate90ccw", "rotate180"]),
  makeMemoryLevel(277, M5H, 700),
  makeSymmetryLevel(278, S5K, "horizontal", "bottom"),
  makeMultiTransformLevel(279, T5K, ["flipX", "rotate90cw"]),
  makeMemoryLevel(280, M5I, 690),

  makeSymmetryLevel(281, S5J, "vertical", "left"),
  makeMultiTransformLevel(282, T5L, ["rotate180", "flipX"]),
  makeMemoryLevel(283, M5J, 680),
  makeSymmetryLevel(284, S5I, "horizontal", "top"),
  makeMultiTransformLevel(285, T5M, ["flipY", "rotate90cw"]),
  makeMemoryLevel(286, M5K, 670),
  makeSymmetryLevel(287, S5H, "vertical", "right"),
  makeMultiTransformLevel(288, T5N, ["rotate90ccw", "flipY"]),
  makeMemoryLevel(289, M5L, 660),
  makeSymmetryLevel(290, S5G, "horizontal", "bottom"),

  makeMultiTransformLevel(291, T5O, ["rotate90cw", "flipX"]),
  makeMemoryLevel(292, M5G, 650),
  makeSymmetryLevel(293, S5F, "vertical", "left"),
  makeMultiTransformLevel(294, T5P, ["flipX", "rotate90ccw"]),
  makeMemoryLevel(295, M5H, 640),
  makeSymmetryLevel(296, S5E, "horizontal", "top"),
  makeMultiTransformLevel(297, T5M, ["rotate180", "flipY"]),
  makeMemoryLevel(298, M5I, 630),
  makeSymmetryLevel(299, S5D, "vertical", "right"),
];

const CHROMATIC_MIXED_SOURCES: Grid[] = [
  C4A,
  C5A,
  C4B,
  C5B,
  C4C,
  C5C,
  C4D,
  C5D,
  C4E,
  C5E,
  C4F,
  C5F,
  C5G,
  C5H,
  C5I,
  C5J,
];

const CHROMATIC_RECIPES: TransformKind[][] = [
  ["rotate90cw"],
  ["flipX"],
  ["rotate180"],
  ["rotate90ccw"],
  ["flipY"],
  ["rotate90cw", "flipY"],
  ["flipX", "rotate180"],
  ["rotate90ccw", "flipX"],
  ["flipY", "rotate90cw"],
  ["rotate180", "flipX"],
];

const MONO_MIXED_SOURCES: Grid[] = [
  T5I,
  T6A,
  T5J,
  T6B,
  T5K,
  T6C,
  T5L,
  T6D,
  T5M,
  T6E,
  T5N,
  T6F,
  T5O,
  T5P,
];

function buildChromaticMixedLevels(startId: number, count: number): Level[] {
  return Array.from({ length: count }, (_, index) => {
    const id = startId + index;
    const source = CHROMATIC_MIXED_SOURCES[index % CHROMATIC_MIXED_SOURCES.length];
    const transforms = CHROMATIC_RECIPES[index % CHROMATIC_RECIPES.length];

    return transforms.length === 1
      ? makeChromaticTransformLevel(id, source, transforms[0])
      : makeChromaticMultiTransformLevel(id, source, transforms);
  });
}

function buildMonochromeGrandmasterLevels(startId: number, count: number): Level[] {
  return Array.from({ length: count }, (_, index) => {
    const id = startId + index;
    const source = MONO_MIXED_SOURCES[index % MONO_MIXED_SOURCES.length];
    const modeIndex = index % 4;

    if (modeIndex === 0) {
      return makeTransformLevel(id, source, CHROMATIC_RECIPES[index % 5][0]);
    }

    if (modeIndex === 1) {
      const previewMs = Math.max(650, 1000 - index * 4);
      return makeMemoryLevel(id, source, previewMs);
    }

    if (modeIndex === 2) {
      const transforms = CHROMATIC_RECIPES[index % CHROMATIC_RECIPES.length];
      return makeMultiTransformLevel(
        id,
        source,
        transforms.length === 1 ? [transforms[0], "flipY"] : transforms
      );
    }

    const symmetryKind: SymmetryKind = index % 8 < 4 ? "vertical" : "horizontal";
    const sourceSide: SymmetrySourceSide[] =
      symmetryKind === "vertical" ? ["left", "right"] : ["top", "bottom"];
    return makeSymmetryLevel(id, source, symmetryKind, sourceSide[index % sourceSide.length]);
  });
}

const chromatic_mixed_endgame: Level[] = buildChromaticMixedLevels(300, 100);
const monochrome_grandmaster: Level[] = buildMonochromeGrandmasterLevels(400, 101);

export const levels: Level[] = [
  ...first50_4x4,
  ...second50_4x4,
  ...hundred_5x5,
  ...hundred_5x5_advanced,
  ...chromatic_mixed_endgame,
  ...monochrome_grandmaster,
];
