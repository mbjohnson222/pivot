"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Level } from "@/types/game";
import GameBoard from "@/components/GameBoard";
import {
  cloneGrid,
  createEmptyGrid,
  gridsEqual,
  isSymmetryCellEditable,
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
  onComplete: () => void;
};

type LeaderboardTab = "level" | "progress";

export default function LevelPlayer({
  level,
  username,
  onComplete,
}: LevelPlayerProps) {
  const [playerGrid, setPlayerGrid] = useState(createEmptyGrid(level.size));
  const [showMemoryPreview, setShowMemoryPreview] = useState(false);
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
    setWon(false);
    setMoves(0);
    setElapsedMs(0);

    if (level.type === "transform") {
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
    initializeLevel();
    void refreshAllLeaderboards();

    return () => {
      clearPreviewTimer();
      stopGameTimer();
    };
  }, [level.id]);

  useEffect(() => {
    if (!hasStarted || won || showMemoryPreview) return;

    if (gridsEqual(playerGrid, level.targetGrid)) {
      setWon(true);
      stopGameTimer();

      const finalElapsed =
        gameStartRef.current !== null ? Date.now() - gameStartRef.current : elapsedMs;

      setElapsedMs(finalElapsed);

      void (async () => {
        if (!username) return;

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
      })();
    }
  }, [playerGrid, level, showMemoryPreview, won, username, moves, elapsedMs, hasStarted]);

  function handleCellClick(row: number, col: number) {
    if (!hasStarted || won || showMemoryPreview) return;

    if (level.type === "symmetry") {
      if (!level.symmetrySourceSide) return;
      if (!isSymmetryCellEditable(level.size, level.symmetrySourceSide, row, col)) {
        return;
      }
    }

    setPlayerGrid((prev) => toggleCell(prev, row, col));
    setMoves((prev) => prev + 1);
  }

  const timerLabel = useMemo(() => formatMs(elapsedMs), [elapsedMs]);

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

        {level.type === "transform" && (
          <div className="grid w-full gap-8 lg:grid-cols-2">
            <div className="flex justify-center">
              <GameBoard
                grid={level.startGrid}
                disabled
                title="Source Pattern"
                subtitle="Use this as the input pattern"
              />
            </div>

            <div className="flex justify-center">
              <GameBoard
                grid={playerGrid}
                onCellClick={handleCellClick}
                disabled={!hasStarted}
                title="Your Build"
                subtitle="Tap tiles to create the transformed result"
              />
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
            />
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
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
              onClick={onComplete}
              className="rounded-2xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Next Level
            </button>
          )}
        </div>

        {won && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300">
            Level complete!
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
            Leaderboards
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Compare scores and progression
          </div>
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

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}