"use client";

import { useEffect, useState } from "react";
import LevelPlayer from "@/components/LevelPlayer";
import SpaceLevelMap from "@/components/SpaceLevelMap";
import UsernameGate from "@/components/UsernameGate";
import { levels } from "@/lib/levels";
import {
  getAvailableStars,
  getProgress,
  recordLevelCompletion,
  spendStars,
  type Progress,
} from "@/lib/progress";
import { getDailyChallenge } from "@/lib/scores";

export default function HomePage() {
  const [progress, setProgress] = useState<Progress>(() => {
    if (typeof window === "undefined") {
      return getProgress();
    }

    return getProgress();
  });
  const [levelIndex, setLevelIndex] = useState(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    return getResumeLevelIndex(getProgress());
  });
  const [username, setUsername] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("pivot-username");
  });
  const [dailyLevelId, setDailyLevelId] = useState<number | null>(null);
  const [isLevelOpen, setIsLevelOpen] = useState(false);

  const level = levels[levelIndex];
  const completedLevelIds = progress.completedLevels;
  const availableStars = getAvailableStars(progress);
  const bestStars = progress.starsByLevel[String(level.id)] ?? 0;
  const highestCompleted = completedLevelIds.length > 0 ? Math.max(...completedLevelIds) : 0;
  const highestUnlockedId = Math.min(
    levels.length,
    highestCompleted > 0 ? highestCompleted + 1 : 1
  );
  const activePlanet = Math.floor((level.id - 1) / 50) + 1;

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const savedProgress = getProgress();
      setProgress(savedProgress);
      setLevelIndex(getResumeLevelIndex(savedProgress));

      const savedUsername = localStorage.getItem("pivot-username");
      if (savedUsername) {
        setUsername(savedUsername);
      }
    });

    void Promise.resolve().then(async () => {
      const daily = await getDailyChallenge();

      if (!cancelled && daily?.level_id) {
        setDailyLevelId(daily.level_id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== "pivot-progress") return;

      const savedProgress = getProgress();
      setProgress(savedProgress);
      setLevelIndex((currentIndex) => {
        const currentLevelId = levels[currentIndex]?.id ?? 1;
        const highestCompletedLevel =
          savedProgress.completedLevels.length > 0
            ? Math.max(...savedProgress.completedLevels)
            : 0;
        const highestUnlockedLevel = Math.min(
          levels.length,
          highestCompletedLevel > 0 ? highestCompletedLevel + 1 : 1
        );

        if (currentLevelId <= highestUnlockedLevel) {
          return currentIndex;
        }

        return getResumeLevelIndex(savedProgress);
      });
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function selectLevel(levelId: number) {
    const index = levels.findIndex((candidate) => candidate.id === levelId);

    if (index >= 0) {
      setLevelIndex(index);
      setIsLevelOpen(true);
    }
  }

  function handleLevelComplete(starsEarned: number) {
    const nextProgress = recordLevelCompletion(level.id, starsEarned);
    setProgress(nextProgress);
    setLevelIndex((prev) => Math.min(prev + 1, levels.length - 1));
  }

  function handleSpendHintStar() {
    const nextProgress = spendStars(1);

    if (!nextProgress) {
      return false;
    }

    setProgress(nextProgress);
    return true;
  }

  function goToDailyChallenge() {
    if (dailyLevelId != null) {
      selectLevel(dailyLevelId);
    }
  }

  function closeLevelOverlay() {
    setIsLevelOpen(false);
  }

  useEffect(() => {
    if (!isLevelOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLevelOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLevelOpen]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_18%),radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.08),transparent_18%),linear-gradient(180deg,#030712_0%,#091127_48%,#020617_100%)] px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden px-2 py-6 sm:px-4 sm:py-10">
          <div className="pointer-events-none absolute left-[6%] top-6 h-14 w-14 rounded-full bg-gradient-to-br from-amber-200 via-orange-400 to-rose-500 opacity-85 shadow-[0_0_40px_rgba(251,146,60,0.45)] sm:h-20 sm:w-20" />
          <div className="pointer-events-none absolute right-[10%] top-16 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-600 opacity-85 shadow-[0_0_36px_rgba(56,189,248,0.4)] sm:h-16 sm:w-16" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-br from-fuchsia-200/60 via-violet-400/50 to-transparent blur-2xl" />

          <div className="relative text-center">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.42em] text-cyan-200/90">
              Puzzle Star Route
            </div>

            <div className="flex flex-col items-center justify-center gap-1">
              <div className="text-[clamp(3.5rem,10vw,7rem)] font-black uppercase leading-none tracking-[0.16em] text-white">
                Pivot
              </div>

              <div className="flex items-center justify-center gap-2 text-[clamp(2.5rem,8vw,6rem)] font-black uppercase leading-none tracking-[0.12em] text-white">
                <span>G</span>
                <span className="relative inline-flex h-[0.95em] w-[0.95em] items-center justify-center rounded-full bg-gradient-to-br from-amber-100 via-orange-300 to-rose-500 text-slate-950 shadow-[0_0_28px_rgba(251,146,60,0.45)]">
                  A
                  <span className="absolute inset-[-10%] rounded-full border border-amber-100/55" />
                  <span className="absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/30" />
                </span>
                <span>L</span>
                <span className="relative inline-flex h-[0.95em] w-[0.95em] items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 via-sky-300 to-blue-600 text-slate-950 shadow-[0_0_28px_rgba(56,189,248,0.42)]">
                  A
                  <span className="absolute inset-[-12%] rounded-full border border-cyan-100/45" />
                  <span className="absolute left-1/2 top-1/2 h-[46%] w-[132%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/40" />
                </span>
                <span>X</span>
                <span>Y</span>
              </div>
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Launch through a galaxy of puzzle planets, with a new world every 50
              levels and a constellation map of nodes to explore.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">
                Current Level {level.id}
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">
                Planet {activePlanet}
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">
                Unlocked Through {highestUnlockedId}
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">
                Stars Banked {availableStars}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6">
          <UsernameGate onUsernameSet={setUsername} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={goToDailyChallenge}
            className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/16"
          >
            Jump to Daily Challenge
          </button>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200">
            Progress: {completedLevelIds.length} cleared
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200">
            Current route: Level {level.id} / {levels.length}
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-100">
            Stars available: {availableStars}
          </div>
        </div>

        <div className="mt-8">
          <SpaceLevelMap
            levels={levels}
            currentLevelId={level.id}
            completedLevelIds={completedLevelIds}
            dailyLevelId={dailyLevelId}
            onSelectLevel={selectLevel}
          />
        </div>

        <section className="mt-8 rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,31,0.96),rgba(7,12,24,0.94))] p-6 shadow-[0_24px_90px_rgba(2,6,23,0.55)] sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Mission Control
              </div>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                Planet {activePlanet}, Level {level.id} selected
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Choose any unlocked circle from the map to launch it in a pop-up puzzle
                window, then return straight to the star route when you close it.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                {username ? (
                  <span>
                    Pilot logged in as{" "}
                    <span className="font-semibold text-cyan-200">{username}</span>
                  </span>
                ) : (
                  <span>Save a username to record scores and leaderboard progress.</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsLevelOpen(true)}
                className="rounded-2xl border border-cyan-300/25 bg-cyan-300/12 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/18"
              >
                Open Level {level.id}
              </button>
            </div>
          </div>
        </section>
      </div>

      {isLevelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 px-4 py-6 backdrop-blur-sm"
          onClick={closeLevelOverlay}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,30,0.98),rgba(5,10,20,0.98))] p-4 shadow-[0_35px_140px_rgba(0,0,0,0.72)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Live Puzzle Window
                </div>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  Planet {activePlanet}, Level {level.id}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Solve the selected node here. Press Escape or use close to jump back to
                  the campaign map.
                </p>
              </div>

              <button
                type="button"
                onClick={closeLevelOverlay}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <LevelPlayer
              level={level}
              username={username}
              availableStars={availableStars}
              bestStars={bestStars}
              onSpendHintStar={handleSpendHintStar}
              onComplete={handleLevelComplete}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function getResumeLevelIndex(progress: Progress) {
  const completed = progress.completedLevels;
  const highestCompleted = completed.length > 0 ? Math.max(...completed) : 0;
  const nextLevelId = Math.min(levels.length, highestCompleted > 0 ? highestCompleted + 1 : 1);

  return Math.max(0, levels.findIndex((level) => level.id === nextLevelId));
}
