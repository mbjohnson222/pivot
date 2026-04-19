"use client";

import { useEffect, useMemo, useState } from "react";
import LevelPlayer from "@/components/LevelPlayer";
import UsernameGate from "@/components/UsernameGate";
import { levels } from "@/lib/levels";
import { getDailyChallenge } from "@/lib/scores";

export default function HomePage() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [username, setUsername] = useState<string | null>(null);
  const [dailyLevelId, setDailyLevelId] = useState<number | null>(null);

  const level = levels[levelIndex];

  useEffect(() => {
    const saved = localStorage.getItem("pivot-username");
    if (saved) {
      setUsername(saved);
    }

    void (async () => {
      const daily = await getDailyChallenge();
      if (daily?.level_id) {
        setDailyLevelId(daily.level_id);
      }
    })();
  }, []);

  const dailyIndex = useMemo(() => {
    if (dailyLevelId == null) return null;
    return levels.findIndex((l) => l.id === dailyLevelId);
  }, [dailyLevelId]);

  function goToDailyChallenge() {
    if (dailyIndex != null && dailyIndex >= 0) {
      setLevelIndex(dailyIndex);
    }
  }

  function handleNextLevel() {
    setLevelIndex((prev) => Math.min(prev + 1, levels.length - 1));
  }

  function handlePrevLevel() {
    setLevelIndex((prev) => Math.max(prev - 1, 0));
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-5 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-block rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Pivot
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">Pivot</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
            A tile puzzle game about visual transformation, spatial reasoning, and memory.
          </p>
        </header>

        <UsernameGate onUsernameSet={setUsername} />

        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handlePrevLevel}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Previous Level
          </button>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300">
            Level {level.id} of {levels.length}
          </div>

          <button
            onClick={handleNextLevel}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Next Level
          </button>

          <button
            onClick={goToDailyChallenge}
            className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
          >
            Daily Challenge
          </button>
        </div>

        <section className="rounded-[32px] border border-slate-800 bg-slate-900/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
          <LevelPlayer
            level={level}
            username={username}
            onComplete={handleNextLevel}
          />
        </section>
      </div>
    </main>
  );
}