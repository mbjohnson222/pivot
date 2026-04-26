"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Grid, Level } from "@/types/game";
import GameBoard from "@/components/GameBoard";
import {
  cloneGrid,
  createEmptyGrid,
  gridsEqual,
  isSymmetryCellEditable,
  setCell,
  toggleCell,
} from "@/lib/board";
import {
  getLevelLeaderboard,
  submitLevelScore,
  updateHighestLevel,
  type LeaderboardEntry,
} from "@/lib/scores";

type LevelPlayerProps = {
  level: Level;
  username: string | null;
  availableStars: number;
  availableFuel: number;
  nextFuelInMs: number;
  startUnitsAvailable?: number;
  startButtonLabel?: string;
  lockedStartLabel?: string;
  instructionSuffix?: string | null;
  showLeaderboard?: boolean;
  showReplayButton?: boolean;
  showNextLevelButton?: boolean;
  awardsStars?: boolean;
  onWatchAdForFuel?: () => Promise<boolean>;
  watchAdLabel?: string;
  onConsumeStart?: () => Promise<boolean> | boolean;
  onSpendHintStar: () => boolean;
  onComplete: (starsEarned: number, elapsedMs: number) => void;
};

export default function LevelPlayer({
  level,
  username,
  availableStars,
  availableFuel,
  nextFuelInMs,
  startUnitsAvailable,
  startButtonLabel,
  lockedStartLabel,
  instructionSuffix,
  showLeaderboard = true,
  showReplayButton = true,
  showNextLevelButton = true,
  awardsStars = true,
  onWatchAdForFuel,
  watchAdLabel,
  onConsumeStart,
  onSpendHintStar,
  onComplete,
}: LevelPlayerProps) {
  const [playerGrid, setPlayerGrid] = useState(createEmptyGrid(level.size));
  const [showMemoryPreview, setShowMemoryPreview] = useState(false);
  const [hintedCell, setHintedCell] = useState<HintCell | null>(null);
  const [hintMessage, setHintMessage] = useState("");
  const [won, setWon] = useState(false);
  const [moves, setMoves] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levelLeaderboard, setLevelLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [paintPickerCell, setPaintPickerCell] = useState<{ row: number; col: number } | null>(
    null
  );
  const startAvailability = startUnitsAvailable ?? availableFuel;

  const previewTimerRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const gameStartRef = useRef<number | null>(null);
  const playAreaRef = useRef<HTMLDivElement | null>(null);
  const gameplayFocusRef = useRef<HTMLDivElement | null>(null);

  function clearPreviewTimer() {
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }

  function stopGameTimer() {
    if (gameTimerRef.current !== null) {
      window.clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
  }

  function startGameTimer() {
    stopGameTimer();
    gameStartRef.current = Date.now();
    setElapsedMs(0);
    setTimedOut(false);

    gameTimerRef.current = window.setInterval(() => {
      if (gameStartRef.current !== null) {
        const nextElapsed = Date.now() - gameStartRef.current;

        if (level.countdownMs && nextElapsed >= level.countdownMs) {
          stopGameTimer();
          setElapsedMs(level.countdownMs);
          setTimedOut(true);
          setHintedCell(null);
          setHintMessage("Time expired. Replay the level to take another run at it.");
          setPaintPickerCell(null);
          return;
        }

        setElapsedMs(nextElapsed);
      }
    }, 100);
  }

  async function refreshLevelLeaderboard() {
    const rows = await getLevelLeaderboard(level.id);
    setLevelLeaderboard(rows);
  }

  function resetLevelState() {
    clearPreviewTimer();
    stopGameTimer();
    setHintedCell(null);
    setHintMessage("");
    setPaintPickerCell(null);
    setSubmitting(false);
    setWon(false);
    setMoves(0);
    setElapsedMs(0);
    setHasStarted(false);
    setTimedOut(false);
    setShowMemoryPreview(false);

    if (level.type === "symmetry") {
      setPlayerGrid(cloneGrid(level.startGrid));
    } else {
      setPlayerGrid(createEmptyGrid(level.size));
    }
  }

  function initializeLevel() {
    resetLevelState();
  }

  async function handleStart() {
    if (hasStarted || startAvailability <= 0) return;

    if (onConsumeStart) {
      const allowed = await onConsumeStart();

      if (!allowed) {
        return;
      }
    }

    setHasStarted(true);
    setHintedCell(null);
    setHintMessage("");
    setPaintPickerCell(null);
    setWon(false);
    setMoves(0);
    setElapsedMs(0);
    setTimedOut(false);

    if (level.type === "transform" || level.type === "chromatic") {
      setShowMemoryPreview(false);
      setPlayerGrid(createEmptyGrid(level.size));
      startGameTimer();
      return;
    }

    if (level.type === "symmetry") {
      setShowMemoryPreview(false);
      setPlayerGrid(cloneGrid(level.startGrid));
      startGameTimer();
      return;
    }

    setShowMemoryPreview(true);
    setPlayerGrid(cloneGrid(level.targetGrid));

    previewTimerRef.current = window.setTimeout(() => {
      setShowMemoryPreview(false);
      setPlayerGrid(createEmptyGrid(level.size));
      startGameTimer();
      previewTimerRef.current = null;
    }, level.memoryPreviewMs ?? 2000);
  }

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      clearPreviewTimer();
      stopGameTimer();
      setHintedCell(null);
      setHintMessage("");
      setPaintPickerCell(null);
      setSubmitting(false);
      setWon(false);
      setMoves(0);
      setElapsedMs(0);
      setHasStarted(false);
      setTimedOut(false);
      setShowMemoryPreview(false);
      setPlayerGrid(
        level.type === "symmetry" ? cloneGrid(level.startGrid) : createEmptyGrid(level.size)
      );
    });

    void Promise.resolve().then(async () => {
      if (cancelled) return;

      const levelRows = await getLevelLeaderboard(level.id);

      if (cancelled) return;

      setLevelLeaderboard(levelRows);
    });

    return () => {
      cancelled = true;
      clearPreviewTimer();
      stopGameTimer();
    };
  }, [level]);

  useEffect(() => {
    if (!hasStarted) return;

    const timeoutId = window.setTimeout(() => {
      (gameplayFocusRef.current ?? playAreaRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasStarted, level.id]);

  async function completeSolvedLevel(finalMoves: number) {
    if (won || timedOut || showMemoryPreview) return;

    setWon(true);
    setHintedCell(null);
    setHintMessage("");
    stopGameTimer();

    const finalElapsed =
      gameStartRef.current !== null ? Date.now() - gameStartRef.current : elapsedMs;
    const starsEarned = getStarReward(level, finalElapsed);

    setElapsedMs(finalElapsed);

    if (username && showLeaderboard) {
      setSubmitting(true);

      await submitLevelScore({
        levelId: level.id,
        username,
        mode: level.type,
        size: level.size,
        moves: finalMoves,
        timeMs: finalElapsed,
      });

      await updateHighestLevel(username, level.id);
      await refreshLevelLeaderboard();

      setSubmitting(false);
    }

    onComplete(starsEarned, finalElapsed);
  }

  function queueAutoSubmit(nextGrid: Grid, nextMoves: number) {
    if (!gridsEqual(nextGrid, level.targetGrid)) return;

    window.setTimeout(() => {
      void completeSolvedLevel(nextMoves);
    }, 0);
  }

  function handleCellClick(row: number, col: number) {
    if (!hasStarted || won || timedOut || showMemoryPreview) return;

    if (level.type === "symmetry") {
      if (!level.symmetrySourceSide) return;
      if (!isSymmetryCellEditable(level.size, level.symmetrySourceSide, row, col)) {
        return;
      }
    }

    if (hintedCell?.row === row && hintedCell.col === col) {
      setHintedCell(null);
      setHintMessage("");
    }

    if (level.type === "chromatic") {
      setPaintPickerCell({ row, col });
    } else {
      const nextGrid = toggleCell(playerGrid, row, col);
      const nextMoves = moves + 1;
      setPlayerGrid(nextGrid);
      setMoves(nextMoves);
      queueAutoSubmit(nextGrid, nextMoves);
    }
  }

  function handleChromaticPaintSelection(value: 0 | 1 | 2) {
    if (!paintPickerCell || level.type !== "chromatic") return;

    const { row, col } = paintPickerCell;
    const nextValue = playerGrid[row][col] === value ? 0 : value;
    const nextGrid = setCell(playerGrid, row, col, nextValue);
    const nextMoves = moves + 1;

    setPlayerGrid(nextGrid);
    setPaintPickerCell(null);
    setMoves(nextMoves);
    queueAutoSubmit(nextGrid, nextMoves);
  }

  const remainingMs = level.countdownMs ? Math.max(0, level.countdownMs - elapsedMs) : elapsedMs;
  const timerLabel = useMemo(() => formatMs(remainingMs), [remainingMs]);
  const showsBoardTimer = level.type === "transform" || level.type === "chromatic";
  const canSubmit =
    hasStarted &&
    !won &&
    !timedOut &&
    !showMemoryPreview &&
    gridsEqual(playerGrid, level.targetGrid);
  const currentStarReward = getStarReward(level, elapsedMs);
  const thresholds = getStarThresholds(level);
  const nextHintCell = getHintCell(playerGrid, level);
  const canUseHint =
    hasStarted &&
    !won &&
    !timedOut &&
    !showMemoryPreview &&
    availableStars > 0 &&
    nextHintCell !== null;

  async function handleSubmit() {
    if (!canSubmit) return;
    await completeSolvedLevel(moves);
  }

  function handleUseHint() {
    if (!canUseHint || !nextHintCell) return;

    const spent = onSpendHintStar();

    if (!spent) {
      setHintMessage("You need at least 1 available star to buy a hint.");
      return;
    }

    setHintedCell(nextHintCell);
    setHintMessage(
      nextHintCell.action === "fill"
        ? "One required tile is outlined in red. Select it to use the hint."
        : "The red-outlined tile is incorrect right now. Toggle it to use the hint."
    );
  }

  async function handleWatchAd() {
    if (adLoading || !onWatchAdForFuel) return;

    setAdLoading(true);
    setHintMessage("");

    try {
      const rewarded = await onWatchAdForFuel();

      if (!rewarded) {
        setHintMessage("The rewarded ad was not completed, so no fuel was added.");
      }
    } catch {
      setHintMessage("The rewarded ad could not be loaded right now. Please try again.");
    } finally {
      setAdLoading(false);
    }
  }

  const modeLabel =
    level.type === "transform"
      ? "Transform"
      : level.type === "memory"
      ? "Memory"
      : level.type === "chromatic"
      ? "Chromatic"
      : "Symmetry";

  function symmetrySubtitle() {
    if (level.symmetrySourceSide === "left") return "Complete the missing right half";
    if (level.symmetrySourceSide === "right") return "Complete the missing left half";
    if (level.symmetrySourceSide === "top") return "Complete the missing bottom half";
    if (level.symmetrySourceSide === "bottom") return "Complete the missing top half";
    return "Complete the missing half";
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
      <div ref={playAreaRef} className="flex flex-col items-center gap-4 pb-24 sm:gap-5 sm:pb-28">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-1.5 text-sm text-slate-300">
            <span className="font-semibold">Level {level.id}</span>
            <span className="text-slate-500">•</span>
            <span>{modeLabel}</span>
            {level.countdownMs && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-rose-200">Countdown</span>
              </>
            )}
            <span className="text-slate-500">•</span>
            <span>{level.size}×{level.size}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {!showsBoardTimer && (
              <StatPill label={level.countdownMs ? "Countdown" : "Timer"} value={timerLabel} />
            )}
            <StatPill label="Stars Banked" value={String(availableStars)} />
            {level.type === "memory" && (
              <StatPill
                label="Preview"
                value={`${Math.round((level.memoryPreviewMs ?? 2000) / 1000)}s`}
              />
            )}
          </div>
        </div>

        <div
          ref={gameplayFocusRef}
          className="h-px w-full scroll-mt-20 sm:scroll-mt-24"
          aria-hidden="true"
        />

        <div className="max-w-2xl rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-3 text-center text-sm text-amber-100">
          {level.prompt}
          {!hasStarted && instructionSuffix && (
            <span className="ml-2 text-amber-200">
              {instructionSuffix}
            </span>
          )}
          {!hasStarted && startAvailability <= 0 && nextFuelInMs > 0 && !startUnitsAvailable && (
            <span className="ml-2 text-rose-200">
              Next fuel arrives in {formatThreshold(nextFuelInMs)}.
            </span>
          )}
        </div>

        {!hasStarted && (
          <button
            onClick={handleStart}
            disabled={startAvailability <= 0}
            className={`rounded-2xl px-6 py-3 text-sm font-semibold transition ${
              startAvailability > 0
                ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                : "cursor-not-allowed bg-slate-700 text-slate-400"
            }`}
          >
            {startAvailability > 0
              ? startButtonLabel ?? "Start Level"
              : lockedStartLabel ?? "Out of Fuel"}
          </button>
        )}

        {!hasStarted && startAvailability <= 0 && onWatchAdForFuel && (
          <button
            type="button"
            onClick={handleWatchAd}
            disabled={adLoading}
            className={`rounded-2xl px-6 py-3 text-sm font-semibold transition ${
              adLoading
                ? "cursor-wait bg-amber-200/20 text-amber-100"
                : "bg-amber-400 text-slate-950 hover:bg-amber-300"
            }`}
          >
            {adLoading ? "Loading Rewarded Ad..." : watchAdLabel ?? "Watch Ad for +1 Fuel"}
          </button>
        )}

        {(level.type === "transform" || level.type === "chromatic") && (
          <div className="grid w-full items-center gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
            <div className="flex justify-center">
              <GameBoard
                grid={level.startGrid}
                disabled
                title="Source Pattern"
                subtitle={
                  level.type === "chromatic"
                    ? "Use both colors and preserve them through the transformation"
                    : "Use this as the input pattern"
                }
              />
            </div>

            <div className="flex justify-center">
              <BoardTimerBadge
                label={level.countdownMs ? "Countdown" : "Timer"}
                value={timerLabel}
                urgent={Boolean(level.countdownMs && remainingMs <= 10_000)}
              />
            </div>

            <div className="flex justify-center">
              <GameBoard
                grid={playerGrid}
                onCellClick={handleCellClick}
                disabled={!hasStarted || timedOut}
                title="Your Build"
                subtitle={
                  level.type === "chromatic"
                    ? "Tap any tile to choose its color"
                    : "Tap tiles to create the transformed result"
                }
                highlightedCell={hintedCell}
              />
            </div>
          </div>
        )}

        {level.type === "memory" && (
          <div className="flex flex-col items-center gap-3">
            <GameBoard
              grid={!hasStarted ? createEmptyGrid(level.size) : playerGrid}
              onCellClick={handleCellClick}
              disabled={!hasStarted || timedOut || showMemoryPreview}
              title={
                !hasStarted
                  ? "Ready"
                  : showMemoryPreview
                  ? "Preview Pattern"
                  : "Your Build"
              }
              subtitle={
                !hasStarted
                  ? "Press start to begin"
                  : showMemoryPreview
                  ? "Study the pattern before it disappears"
                  : "Tap tiles to rebuild the pattern from memory"
              }
              highlightedCell={!showMemoryPreview ? hintedCell : null}
            />

            {hasStarted && showMemoryPreview && (
              <p className="text-sm font-medium text-amber-300">
                Memorize the pattern…
              </p>
            )}
          </div>
        )}

        {level.type === "symmetry" && (
          <div className="flex flex-col items-center gap-3">
            <GameBoard
              grid={playerGrid}
              onCellClick={handleCellClick}
              disabled={!hasStarted || timedOut}
              isCellEditable={(row, col) => {
                if (!hasStarted || timedOut || !level.symmetrySourceSide) return false;
                return isSymmetryCellEditable(level.size, level.symmetrySourceSide, row, col);
              }}
              title="Complete the Symmetry"
              subtitle={symmetrySubtitle()}
              highlightedCell={hintedCell}
            />
          </div>
        )}

        <div className="sticky bottom-0 z-20 -mx-2 flex flex-nowrap items-center justify-center gap-2 overflow-x-auto border-t border-white/10 bg-[linear-gradient(180deg,rgba(8,14,30,0.45),rgba(8,14,30,0.96))] px-2 py-3 pb-[calc(var(--safe-bottom)+0.75rem)] backdrop-blur-xl sm:-mx-3 sm:gap-3 sm:px-3 sm:pb-3">
          {hasStarted && !won && !timedOut && (
            <>
              <button
                type="button"
                onClick={handleUseHint}
                disabled={!canUseHint}
                className={`shrink-0 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition sm:px-5 ${
                  canUseHint
                    ? "border border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
                    : "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500"
                }`}
              >
                Hint (-1 star)
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`shrink-0 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition sm:px-5 ${
                  canSubmit
                    ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                Submit
              </button>
            </>
          )}

          {showReplayButton && (
            <button
              onClick={initializeLevel}
              className="shrink-0 whitespace-nowrap rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 sm:px-5"
            >
              Replay Level
            </button>
          )}

          {won && showNextLevelButton && (
            <button
              onClick={() => onComplete(getStarReward(level, elapsedMs), elapsedMs)}
              className="shrink-0 whitespace-nowrap rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 sm:px-5"
            >
              Next Level
            </button>
          )}
        </div>

        {hasStarted && !won && (
          <div
            className={`max-w-2xl rounded-2xl px-5 py-3 text-sm ${
              timedOut
                ? "border border-rose-400/25 bg-rose-400/10 text-rose-100"
                : "border border-amber-400/20 bg-amber-400/10 text-amber-100"
            }`}
          >
            {timedOut
              ? "Time expired before the pattern was submitted. Replay the level to try again."
              : hintMessage || "Hints outline one missing tile in red and cost 1 banked star."}
          </div>
        )}

        {level.type === "chromatic" && paintPickerCell && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
            onClick={() => setPaintPickerCell(null)}
          >
            <div
              className="w-full max-w-xs rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,31,0.98),rgba(6,11,22,0.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  Choose Tile Color
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Select the color for row {paintPickerCell.row + 1}, column{" "}
                  {paintPickerCell.col + 1}.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                <PaintPickerButton
                  label="Clear"
                  colorClass="border-slate-600/80 bg-gradient-to-br from-slate-700 to-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  onClick={() => handleChromaticPaintSelection(0)}
                />
                <PaintPickerButton
                  label="Cyan"
                  colorClass="border-cyan-200/80 bg-gradient-to-br from-cyan-300 to-cyan-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_18px_rgba(6,182,212,0.28)]"
                  onClick={() => handleChromaticPaintSelection(1)}
                />
                <PaintPickerButton
                  label="Amber"
                  colorClass="border-amber-100/80 bg-gradient-to-br from-amber-200 to-orange-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_18px_rgba(251,146,60,0.3)]"
                  onClick={() => handleChromaticPaintSelection(2)}
                />
              </div>

              <button
                type="button"
                onClick={() => setPaintPickerCell(null)}
                className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {won && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300">
            {awardsStars
              ? `Level complete! ${currentStarReward}/3 stars for this run.`
              : "Daily puzzle complete!"}
            {awardsStars && elapsedMs > 30_000 && !startUnitsAvailable && (
              <span className="ml-2 text-amber-200">This clear cost 1 fuel.</span>
            )}
            {username && showLeaderboard ? (
              <span className="ml-2 text-emerald-200">
                {submitting ? "Saving score…" : "Score saved."}
              </span>
            ) : !username && showLeaderboard ? (
              <span className="ml-2 text-amber-200">
                Save a username to join the leaderboard.
              </span>
            ) : null}
          </div>
        )}
      </div>

      {showLeaderboard && (
        <aside className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-4">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Stars + Leaderboards
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Earn stars on fast clears and spend them on hints
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          <div className="font-semibold text-white">Speed thresholds</div>
          <div className="mt-2 text-slate-400">3 stars: {formatThreshold(thresholds.threeStarMs)}</div>
          <div className="text-slate-400">2 stars: {formatThreshold(thresholds.twoStarMs)}</div>
          <div className="text-slate-400">1 star: finish the level</div>
        </div>

        <div className="space-y-2">
          {levelLeaderboard.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
              No scores yet. Be the first.
            </div>
          ) : (
            levelLeaderboard.map((entry, index) => (
              <div
                key={`${entry.username}-${entry.timeMs}-${index}`}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-white">
                    #{index + 1} {entry.username}
                  </div>
                  <div className="text-xs text-slate-400">{entry.moves} moves</div>
                </div>

                <div className="text-sm font-semibold text-cyan-300">
                  {formatMs(entry.timeMs)}
                </div>
              </div>
            ))
          )}
        </div>
        </aside>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm">
      <span className="mr-2 text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function BoardTimerBadge({
  label,
  value,
  urgent,
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-[0_14px_34px_rgba(2,6,23,0.34)] ${
        urgent
          ? "border-rose-300/35 bg-rose-400/16 text-rose-50"
          : "border-cyan-300/25 bg-cyan-300/10 text-cyan-50"
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function PaintPickerButton({
  colorClass,
  label,
  onClick,
}: {
  colorClass: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
    >
      <span className={`h-5 w-5 rounded-full border ${colorClass}`} />
      <span>{label}</span>
    </button>
  );
}

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function formatThreshold(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type HintCell = {
  row: number;
  col: number;
  action: "fill" | "toggle";
};

function getHintCell(grid: Grid, level: Level): HintCell | null {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (level.type === "symmetry") {
        if (!level.symmetrySourceSide) continue;
        if (!isSymmetryCellEditable(level.size, level.symmetrySourceSide, row, col)) continue;
      }

      if (level.targetGrid[row][col] !== 0 && grid[row][col] === 0) {
        return { row, col, action: "fill" };
      }
    }
  }

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (level.type === "symmetry") {
        if (!level.symmetrySourceSide) continue;
        if (!isSymmetryCellEditable(level.size, level.symmetrySourceSide, row, col)) continue;
      }

      if (level.targetGrid[row][col] !== grid[row][col]) {
        return { row, col, action: "toggle" };
      }
    }
  }

  return null;
}

function getStarThresholds(level: Level) {
  const baseSeconds =
    level.type === "transform" || level.type === "chromatic"
      ? level.size * 4 + 4
      : level.type === "memory"
      ? level.size * 5 + Math.round((level.memoryPreviewMs ?? 2000) / 1000) + 4
      : level.size * 4 + 3;

  return {
    threeStarMs: baseSeconds * 1000,
    twoStarMs: Math.round(baseSeconds * 1.3 * 1000),
  };
}

function getStarReward(level: Level, elapsedMs: number) {
  const thresholds = getStarThresholds(level);

  if (elapsedMs <= thresholds.threeStarMs) return 3;
  if (elapsedMs <= thresholds.twoStarMs) return 2;
  return 1;
}
