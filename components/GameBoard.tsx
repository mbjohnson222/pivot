"use client";

import type { Grid } from "@/types/game";

type GameBoardProps = {
  grid: Grid;
  onCellClick?: (row: number, col: number) => void;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
  isCellEditable?: (row: number, col: number) => boolean;
  highlightedCell?: { row: number; col: number } | null;
};

export default function GameBoard({
  grid,
  onCellClick,
  disabled = false,
  title,
  subtitle,
  isCellEditable,
  highlightedCell,
}: GameBoardProps) {
  const size = grid.length;
  const cellSizeClass =
    size >= 10
      ? "h-6 w-6 rounded-lg sm:h-8 sm:w-8"
      : size >= 6
      ? "h-8 w-8 rounded-xl sm:h-10 sm:w-10"
      : "h-12 w-12 rounded-2xl sm:h-14 sm:w-14";
  const boardPaddingClass = size >= 10 ? "p-2" : size >= 6 ? "p-2.5" : "p-3";
  const boardGap = size >= 10 ? "0.375rem" : size >= 6 ? "0.45rem" : "0.5rem";

  return (
    <div className="flex flex-col items-center gap-3">
      {(title || subtitle) && (
        <div className="text-center">
          {title && (
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              {title}
            </div>
          )}
          {subtitle && <div className="mt-1 text-xs text-slate-400">{subtitle}</div>}
        </div>
      )}

      <div className="rounded-[28px] border border-slate-700/70 bg-slate-900/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div
          className={`grid rounded-[22px] bg-slate-800/90 ${boardPaddingClass}`}
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gap: boardGap,
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const editable = isCellEditable ? isCellEditable(r, c) : !disabled;
              const actuallyDisabled = disabled || !editable;
              const isHighlighted =
                highlightedCell?.row === r && highlightedCell?.col === c;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => {
                    if (!actuallyDisabled) {
                      onCellClick?.(r, c);
                    }
                  }}
                  disabled={actuallyDisabled}
                  aria-label={`Row ${r + 1}, Column ${c + 1}, ${
                    cell === 1 ? "filled" : "empty"
                  }`}
                  className={[
                    cellSizeClass,
                    "border transition duration-150",
                    cell === 1
                      ? editable
                        ? "border-cyan-200/80 bg-gradient-to-br from-cyan-300 to-cyan-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_18px_rgba(6,182,212,0.28)]"
                        : "border-violet-200/50 bg-gradient-to-br from-violet-400/80 to-violet-600/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                      : cell === 2
                      ? editable
                        ? "border-amber-100/80 bg-gradient-to-br from-amber-200 to-orange-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_18px_rgba(251,146,60,0.3)]"
                        : "border-amber-100/50 bg-gradient-to-br from-amber-300/80 to-orange-600/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                      : editable
                      ? "border-slate-600/80 bg-gradient-to-br from-slate-700 to-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : "border-slate-700/80 bg-gradient-to-br from-slate-800 to-slate-900 opacity-85",
                    actuallyDisabled
                      ? "cursor-default"
                      : "cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95",
                    isHighlighted
                      ? "border-red-400 ring-2 ring-red-400/85 ring-offset-2 ring-offset-slate-900"
                      : "",
                  ].join(" ")}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
