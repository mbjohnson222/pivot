import type { Grid, Level } from "@/types/game";
import { createEmptyGrid, flipX, flipY, rotate180, rotate90CCW, rotate90CW } from "@/lib/board";

type TransformKind = "rotate90cw" | "rotate90ccw" | "rotate180" | "flipX" | "flipY";

export function getTodayDailyKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildDailyPuzzle(dateKey: string): Level {
  const random = createSeededRandom(dateKey);
  const chromatic = random() < 0.5;
  const transforms = buildTransformRecipe(random);
  const source = buildDailySourceGrid(8, chromatic, random, transforms);
  const target = applyTransformSequence(source, transforms);

  return {
    id: 100000 + numericDaySeed(dateKey),
    type: chromatic ? "chromatic" : "transform",
    size: 8,
    startGrid: source,
    targetGrid: target,
    prompt: buildDailyPrompt(chromatic, transforms),
  };
}

function buildDailySourceGrid(
  size: number,
  chromatic: boolean,
  random: () => number,
  transforms: TransformKind[]
) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const grid = createEmptyGrid(size);
    const clusters = 8 + Math.floor(random() * 5);

    for (let clusterIndex = 0; clusterIndex < clusters; clusterIndex++) {
      let row = Math.floor(random() * size);
      let col = Math.floor(random() * size);
      const steps = 2 + Math.floor(random() * 5);
      const value = chromatic && random() < 0.5 ? 2 : 1;

      for (let step = 0; step < steps; step++) {
        grid[row][col] = value;

        if (random() < 0.45) {
          const branchRow = clamp(row + randomOffset(random), 0, size - 1);
          const branchCol = clamp(col + randomOffset(random), 0, size - 1);
          grid[branchRow][branchCol] = chromatic && random() < 0.35 ? alternateValue(value) : value;
        }

        row = clamp(row + randomOffset(random), 0, size - 1);
        col = clamp(col + randomOffset(random), 0, size - 1);
      }
    }

    const filledCells = grid.flat().filter((cell) => cell !== 0).length;
    if (filledCells < 22 || filledCells > 42) {
      continue;
    }

    const target = applyTransformSequence(grid, transforms);
    if (!gridsEqual(grid, target)) {
      return grid;
    }
  }

  return buildFallbackGrid(size, chromatic);
}

function buildFallbackGrid(size: number, chromatic: boolean) {
  const grid = createEmptyGrid(size);

  for (let row = 1; row < size - 1; row++) {
    const colA = (row * 2) % size;
    const colB = (row * 3 + 1) % size;
    grid[row][colA] = chromatic && row % 2 === 0 ? 2 : 1;
    grid[row][colB] = chromatic && row % 3 === 0 ? 2 : 1;
  }

  return grid;
}

function buildTransformRecipe(random: () => number): TransformKind[] {
  const transformPool: TransformKind[] = [
    "rotate90cw",
    "rotate90ccw",
    "rotate180",
    "flipX",
    "flipY",
  ];
  const first = transformPool[Math.floor(random() * transformPool.length)];

  if (random() < 0.55) {
    return [first];
  }

  let second = transformPool[Math.floor(random() * transformPool.length)];
  while (second === first) {
    second = transformPool[Math.floor(random() * transformPool.length)];
  }

  return [first, second];
}

function buildDailyPrompt(chromatic: boolean, transforms: TransformKind[]) {
  const recipe = transforms.map(transformInstructionLabel);
  const joined =
    recipe.length === 1 ? recipe[0] : `${recipe[0]}, then ${recipe.slice(1).join(", then ")}`;

  return chromatic
    ? `Daily puzzle: build the 8x8 two-color result after ${joined}. Keep each color on the correct tile.`
    : `Daily puzzle: build the 8x8 result after ${joined}.`;
}

function transformInstructionLabel(transform: TransformKind) {
  switch (transform) {
    case "rotate90cw":
      return "rotating the source pattern 90° clockwise";
    case "rotate90ccw":
      return "rotating the source pattern 90° counterclockwise";
    case "rotate180":
      return "rotating the source pattern 180°";
    case "flipX":
      return "flipping the source pattern across the X-axis";
    case "flipY":
      return "flipping the source pattern across the Y-axis";
  }
}

function applyTransformSequence(grid: Grid, transforms: TransformKind[]) {
  return transforms.reduce((current, transform) => applyTransform(current, transform), grid);
}

function applyTransform(grid: Grid, transform: TransformKind) {
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

function numericDaySeed(dateKey: string) {
  return dateKey.split("-").reduce((sum, part) => sum + Number(part), 0);
}

function createSeededRandom(seedText: string) {
  let hash = 2166136261;

  for (let index = 0; index < seedText.length; index++) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return function next() {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomOffset(random: () => number) {
  return Math.floor(random() * 3) - 1;
}

function alternateValue(value: 1 | 2) {
  return value === 1 ? 2 : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gridsEqual(a: Grid, b: Grid) {
  for (let row = 0; row < a.length; row++) {
    for (let col = 0; col < a[row].length; col++) {
      if (a[row][col] !== b[row][col]) {
        return false;
      }
    }
  }

  return true;
}
