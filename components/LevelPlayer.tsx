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
  getProgressLeaderboard,
  submitLevelScore,
  updateHighestLevel,
  type LeaderboardEntry,
  type ProgressLeaderboardEntry,
} from "@/lib/scores";

type LevelPlayerProps = {
  level: Level;
  username: string | null;
  availableStars: number;
  bestStars: number;
  onSpendHintStar: () => boolean;
  onComplete: (starsEarned: number) => void;
};

type LeaderboardTab = "level" | "progress";

export default function LevelPlayer({
  level,
  username,
  availableStars,
  bestStars,
  onSpendHintStar,
  onComplete,
}: LevelPlayerProps) {
  const [playerGrid, setPlayerGrid] = useState(createEmptyGrid(level.size));
  const [activePaint, setActivePaint] = useState<0 | 1 | 2>(1);
  const [showMemoryPreview, setShowMemoryPreview] = useState(false);
  const [hintedCell, setHintedCell] = useState<HintCell | null>(null);
  const [hintMessage, setHintMessage] = useState("");
  const [won, setWon] = useState(false);
  const [moves, setMoves] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levelLeaderboard, setLevelLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [progressLeaderboard, setProgressLeaderboard] = useState<ProgressLeaderboardEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>("level");

  const previewTimerRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const gameStartRef = useRef<number | null>(null);

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

    gameTimerRef.current = window.setInterval(() => {
      if (gameStartRef.current !== null) {
        setElapsedMs(Date.now() - gameStartRef.current);
      }
    }, 100);
  }

  async function refreshLevelLeaderboard() {
    const rows = await getLevelLeaderboard(level.id);
    setLevelLeaderboard(rows);
  }

  async function refreshProgressLeaderboard() {
    const rows = await getProgressLeaderboard();
    setProgressLeaderboard(rows);
  }

  async function refreshAllLeaderboards() {
    await Promise.all([refreshLevelLeaderboard(), refreshProgressLeaderboard()]);
  }

  function resetLevelState() {
    clearPreviewTimer();
    stopGameTimer();
    setHintedCell(null);
    setHintMessage("");
    setActivePaint(1);
    setSubmitting(false);
    setWon(false);
    setMoves(0);
    setElapsedMs(0);
    setHasStarted(false);
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

  function handleStart() {
    if (hasStarted) return;

    setHasStarted(true);
    setHintedCell(null);
    setHintMessage("");
    setActivePaint(1);
    setWon(false);
    setMoves(0);
    setElapsedMs(0);

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
      setActivePaint(1);
      setSubmitting(false);
      setWon(false);
      setMoves(0);
      setElapsedMs(0);
      setHasStarted(false);
      setShowMemoryPreview(false);
      setPlayerGrid(
        level.type === "symmetry" ? cloneGrid(level.startGrid) : createEmptyGrid(level.size)
      );
    });

    void Promise.resolve().then(async () => {
      if (cancelled) return;

      const [levelRows, progressRows] = await Promise.all([
        getLevelLeaderboard(level.id),
        getProgressLeaderboard(),
      ]);

      if (cancelled) return;

      setLevelLeaderboard(levelRows);
      setProgressLeaderboard(progressRows);
    });

    return () => {
      cancelled = true;
      clearPreviewTimer();
      stopGameTimer();
    };
  }, [level]);

  function handleCellClick(row: number, col: number) {
    if (!hasStarted || won || showMemoryPreview) return;

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
      setPlayerGrid((prev) => {
        const nextValue = prev[row][col] === activePaint ? 0 : activePaint;
        return setCell(prev, row, col, nextValue);
      });
    } else {
      setPlayerGrid((prev) => toggleCell(prev, row, col));
    }
    setMoves((prev) => prev + 1);
  }

  const timerLabel = useMemo(() => formatMs(elapsedMs), [elapsedMs]);
  const canSubmit =
    hasStarted && !won && !showMemoryPreview && gridsEqual(playerGrid, level.targetGrid);
  const currentStarReward = getStarReward(level, elapsedMs);
  const thresholds = getStarThresholds(level);
  const nextHintCell = getHintCell(playerGrid, level);
  const canUseHint =
    hasStarted && !won && !showMemoryPreview && availableStars > 0 && nextHintCell !== null;

  async function handleSubmit() {
    if (!canSubmit) return;

    setWon(true);
    setHintedCell(null);
    setHintMessage("");
    stopGameTimer();

    const finalElapsed =
      gameStartRef.current !== null ? Date.now() - gameStartRef.current : elapsedMs;
    const starsEarned = getStarReward(level, finalElapsed);

    setElapsedMs(finalElapsed);

    if (username) {
      setSubmitting(true);

      await submitLevelScore({
        levelId: level.id,
        username,
        mode: level.type,
        size: level.size,
        moves,
        timeMs: finalElapsed,
      });

      await updateHighestLevel(username, level.id);
      await refreshAllLeaderboards();

      setSubmitting(false);
    }

    onComplete(starsEarned);
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

  async function handleShareDailyChallenge() {
    const shareText = `I played today's Pivot daily challenge and finished in ${formatMs(
      elapsedMs
    )} with ${moves} moves. Can you beat me?`;

    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/?daily=1&level=${level.id}`
        : "";

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Pivot Daily Challenge",
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert("Share text copied to clipboard.");
      }
    } catch {}
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
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-1.5 text-sm text-slate-300">
            <span className="font-semibold">Level {level.id}</span>
            <span className="text-slate-500">•</span>
            <span>{modeLabel}</span>
            <span className="text-slate-500">•</span>
            <span>{level.size}×{level.size}</span>
          </div>

          <h2 className="mx-auto max-w-2xl text-2xl font-bold leading-tight text-white">
            {level.prompt}
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <StatPill label="Moves" value={String(moves)} />
          <StatPill label="Timer" value={timerLabel} />
          <StatPill label="Stars Banked" value={String(availableStars)} />
          <StatPill label="Best Stars" value={`${bestStars}/3`} />
          <StatPill label="Current Clear" value={`${currentStarReward}/3`} />
          {level.type === "memory" && (
            <StatPill
              label="Preview"
              value={`${Math.round((level.memoryPreviewMs ?? 2000) / 1000)}s`}
            />
          )}
        </div>

        {!hasStarted && (
          <button
            onClick={handleStart}
            className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Start Level
          </button>
        )}

        {(level.type === "transform" || level.type === "chromatic") && (
          <div className="grid w-full gap-8 lg:grid-cols-2">
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

            <div className="flex flex-col items-center gap-4">
              {level.type === "chromatic" && (
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-300">Paint</span>
                  <PaintButton
                    label="Clear"
                    active={activePaint === 0}
                    colorClass="bg-slate-700"
                    onClick={() => setActivePaint(0)}
                  />
                  <PaintButton
                    label="Cyan"
                    active={activePaint === 1}
                    colorClass="bg-cyan-400"
                    onClick={() => setActivePaint(1)}
                  />
                  <PaintButton
                    label="Amber"
                    active={activePaint === 2}
                    colorClass="bg-amber-400"
                    onClick={() => setActivePaint(2)}
                  />
                </div>
              )}

              <div className="flex justify-center">
                <GameBoard
                  grid={playerGrid}
                  onCellClick={handleCellClick}
                  disabled={!hasStarted}
                  title="Your Build"
                  subtitle={
                    level.type === "chromatic"
                      ? "Choose a paint color, then tap tiles to place the correct color"
                      : "Tap tiles to create the transformed result"
                  }
                  highlightedCell={hintedCell}
                />
              </div>
            </div>
          </div>
        )}

        {level.type === "memory" && (
          <div className="flex flex-col items-center gap-3">
            <GameBoard
              grid={!hasStarted ? createEmptyGrid(level.size) : playerGrid}
              onCellClick={handleCellClick}
              disabled={!hasStarted || showMemoryPreview}
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
              disabled={!hasStarted}
              isCellEditable={(row, col) => {
                if (!hasStarted || !level.symmetrySourceSide) return false;
                return isSymmetryCellEditable(level.size, level.symmetrySourceSide, row, col);
              }}
              title="Complete the Symmetry"
              subtitle={symmetrySubtitle()}
              highlightedCell={hintedCell}
            />
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {hasStarted && !won && (
            <>
              <button
                type="button"
                onClick={handleUseHint}
                disabled={!canUseHint}
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${
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
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${
                  canSubmit
                    ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                Submit
              </button>
            </>
          )}

          <button
            onClick={initializeLevel}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Replay Level
          </button>

          <button
            onClick={handleShareDailyChallenge}
            className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
          >
            Share Daily Challenge
          </button>

          {won && (
            <button
              onClick={() => onComplete(getStarReward(level, elapsedMs))}
              className="rounded-2xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Next Level
            </button>
          )}
        </div>

        {hasStarted && !won && (
          <div className="max-w-2xl rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-3 text-sm text-amber-100">
            {hintMessage || "Hints outline one missing tile in red and cost 1 banked star."}
          </div>
        )}

        {won && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300">
            Level complete! {currentStarReward}/3 stars for this run.
            {username ? (
              <span className="ml-2 text-emerald-200">
                {submitting ? "Saving score…" : "Score saved."}
              </span>
            ) : (
              <span className="ml-2 text-amber-200">
                Save a username to join the leaderboard.
              </span>
            )}
          </div>
        )}
      </div>

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

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setLeaderboardTab("level")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              leaderboardTab === "level"
                ? "bg-cyan-400 text-slate-950"
                : "border border-slate-700 bg-slate-950/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Level
          </button>

          <button
            onClick={() => setLeaderboardTab("progress")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              leaderboardTab === "progress"
                ? "bg-cyan-400 text-slate-950"
                : "border border-slate-700 bg-slate-950/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Progress
          </button>
        </div>

        {leaderboardTab === "level" && (
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
        )}

        {leaderboardTab === "progress" && (
          <div className="space-y-2">
            {progressLeaderboard.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                No progress recorded yet.
              </div>
            ) : (
              progressLeaderboard.map((entry, index) => (
                <div
                  key={`${entry.username}-${entry.highestLevelId}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      #{index + 1} {entry.username}
                    </div>
                    <div className="text-xs text-slate-400">Highest level reached</div>
                  </div>

                  <div className="text-sm font-semibold text-cyan-300">
                    {entry.highestLevelId}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </aside>
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

function PaintButton({
  active,
  colorClass,
  label,
  onClick,
}: {
  active: boolean;
  colorClass: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-white/40 bg-white/10 text-white"
          : "border-slate-700 bg-slate-950/60 text-slate-300 hover:bg-slate-800"
      }`}
    >
      <span className={`h-3.5 w-3.5 rounded-full ${colorClass}`} />
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

      if (level.targetGrid[row][col] === 1 && grid[row][col] === 0) {
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
      ? level.size * 7 + 8
      : level.type === "memory"
      ? level.size * 8 + Math.round((level.memoryPreviewMs ?? 2000) / 1000) + 8
      : level.size * 6 + 7;

  return {
    threeStarMs: baseSeconds * 1000,
    twoStarMs: Math.round(baseSeconds * 1.6 * 1000),
  };
}

function getStarReward(level: Level, elapsedMs: number) {
  const thresholds = getStarThresholds(level);

  if (elapsedMs <= thresholds.threeStarMs) return 3;
  if (elapsedMs <= thresholds.twoStarMs) return 2;
  return 1;
}
