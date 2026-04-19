export type Cell = 0 | 1;
export type Grid = Cell[][];

export type LevelType = "transform" | "memory" | "symmetry";
export type SymmetryKind = "vertical" | "horizontal";
export type SymmetrySourceSide = "left" | "right" | "top" | "bottom";

export type Level = {
  id: number;
  type: LevelType;
  size: number;
  startGrid: Grid;
  targetGrid: Grid;
  prompt: string;
  memoryPreviewMs?: number;
  symmetryKind?: SymmetryKind;
  symmetrySourceSide?: SymmetrySourceSide;
};