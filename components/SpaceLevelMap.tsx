"use client";

import { useEffect, useRef, useState } from "react";
import type { Level } from "@/types/game";

type SpaceLevelMapProps = {
  levels: Level[];
  currentLevelId: number;
  focusLevelId: number;
  completedLevelIds: number[];
  starsByLevel: Record<string, number>;
  dailyLevelId: number | null;
  onSelectLevel: (levelId: number) => void;
};

type PlanetTheme = {
  name: string;
  title: string;
  subtitle: string;
  aura: string;
  surface: string;
  ring: string;
  trail: string;
  activeGlow: string;
};

type PlanetSector = {
  index: number;
  startLevel: number;
  endLevel: number;
  levels: Level[];
  theme: PlanetTheme;
};

const LEVELS_PER_PLANET = 50;
const TOP_OFFSET = 110;
const CLUSTER_HEIGHT = 300;
const CLUSTER_GAP = 78;
const MOBILE_X_SCALE = 0.76;
const MOBILE_X_CENTER = 50;

type StarPoint = {
  x: number;
  y: number;
};

type ConstellationTemplate = {
  points: StarPoint[];
  edges: Array<[number, number]>;
};

const PLANET_THEMES: PlanetTheme[] = [
  {
    name: "Astra-1",
    title: "Ion Dunes",
    subtitle: "A warm-up world of copper storms and training satellites.",
    aura: "from-amber-300/28 via-orange-500/14 to-transparent",
    surface: "from-amber-200 via-orange-400 to-rose-500",
    ring: "border-amber-200/40",
    trail: "#f59e0b",
    activeGlow: "shadow-[0_0_28px_rgba(251,191,36,0.5)]",
  },
  {
    name: "Pelagia-2",
    title: "Tidal Glass",
    subtitle: "Cool blue currents where patterns drift like schools of stars.",
    aura: "from-cyan-300/28 via-sky-500/14 to-transparent",
    surface: "from-cyan-200 via-sky-400 to-blue-600",
    ring: "border-cyan-200/40",
    trail: "#22d3ee",
    activeGlow: "shadow-[0_0_28px_rgba(34,211,238,0.45)]",
  },
  {
    name: "Verdant-3",
    title: "Moss Orbit",
    subtitle: "A living planet where mirrored forests hide puzzle ruins.",
    aura: "from-lime-300/25 via-emerald-500/15 to-transparent",
    surface: "from-lime-200 via-emerald-400 to-green-600",
    ring: "border-lime-200/35",
    trail: "#84cc16",
    activeGlow: "shadow-[0_0_28px_rgba(132,204,22,0.45)]",
  },
  {
    name: "Noctis-4",
    title: "Velvet Eclipse",
    subtitle: "Sharper transformations under a moonlit violet horizon.",
    aura: "from-fuchsia-300/25 via-violet-500/15 to-transparent",
    surface: "from-fuchsia-200 via-violet-400 to-indigo-700",
    ring: "border-fuchsia-200/35",
    trail: "#d946ef",
    activeGlow: "shadow-[0_0_28px_rgba(217,70,239,0.45)]",
  },
  {
    name: "Cryon-5",
    title: "Polar Halo",
    subtitle: "An icy edge-world where memory trials stay crisp and unforgiving.",
    aura: "from-slate-200/22 via-blue-300/14 to-transparent",
    surface: "from-slate-100 via-blue-200 to-slate-500",
    ring: "border-slate-100/35",
    trail: "#cbd5e1",
    activeGlow: "shadow-[0_0_28px_rgba(226,232,240,0.45)]",
  },
  {
    name: "Helion-6",
    title: "Solar Crown",
    subtitle: "Endgame routes through a blazing system core.",
    aura: "from-yellow-200/25 via-rose-400/15 to-transparent",
    surface: "from-yellow-100 via-orange-300 to-rose-500",
    ring: "border-yellow-100/35",
    trail: "#fb7185",
    activeGlow: "shadow-[0_0_28px_rgba(251,113,133,0.45)]",
  },
];

const CONSTELLATION_TEMPLATES: ConstellationTemplate[] = [
  {
    points: [
      { x: 18, y: 24 },
      { x: 34, y: 10 },
      { x: 50, y: 22 },
      { x: 66, y: 12 },
      { x: 80, y: 28 },
      { x: 72, y: 48 },
      { x: 56, y: 60 },
      { x: 38, y: 52 },
      { x: 24, y: 70 },
      { x: 44, y: 82 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [7, 9],
    ],
  },
  {
    points: [
      { x: 22, y: 18 },
      { x: 40, y: 30 },
      { x: 58, y: 16 },
      { x: 74, y: 30 },
      { x: 64, y: 50 },
      { x: 46, y: 44 },
      { x: 28, y: 56 },
      { x: 20, y: 78 },
      { x: 44, y: 74 },
      { x: 68, y: 82 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [1, 5],
      [5, 4],
      [5, 6],
      [6, 7],
      [6, 8],
      [8, 9],
    ],
  },
  {
    points: [
      { x: 18, y: 20 },
      { x: 32, y: 14 },
      { x: 48, y: 26 },
      { x: 62, y: 16 },
      { x: 78, y: 24 },
      { x: 68, y: 46 },
      { x: 50, y: 54 },
      { x: 32, y: 44 },
      { x: 26, y: 68 },
      { x: 48, y: 82 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 6],
      [6, 5],
      [6, 7],
      [7, 8],
      [8, 9],
    ],
  },
];

export default function SpaceLevelMap({
  levels,
  currentLevelId,
  focusLevelId,
  completedLevelIds,
  starsByLevel,
  dailyLevelId,
  onSelectLevel,
}: SpaceLevelMapProps) {
  const completed = new Set(completedLevelIds);
  const highestCompleted = completedLevelIds.length > 0 ? Math.max(...completedLevelIds) : 0;
  const highestUnlockedId =
    highestCompleted > 0 ? Math.min(highestCompleted + 1, levels.length) : 1;
  const sectors = buildPlanetSectors(levels);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isPhoneViewport, setIsPhoneViewport] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(false);

  useEffect(() => {
    const phoneMediaQuery = window.matchMedia("(max-width: 767px)");
    const mediaQuery = window.matchMedia("(min-width: 768px) and (max-width: 1180px)");
    const updateViewport = () => {
      setIsPhoneViewport(phoneMediaQuery.matches);
      setIsTabletViewport(mediaQuery.matches);
    };

    updateViewport();
    phoneMediaQuery.addEventListener("change", updateViewport);
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      phoneMediaQuery.removeEventListener("change", updateViewport);
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    function centerOnLevel() {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const activeNode = scroller.querySelector<HTMLElement>(
        `[data-level-id="${focusLevelId}"]`
      );
      if (!activeNode) return;

      activeNode.scrollIntoView({
        behavior: "auto",
        block: "center",
        inline: "center",
      });
    }

    const rafId = window.requestAnimationFrame(centerOnLevel);
    const timeoutIds = [120, 320, 700, 1100].map((delay) =>
      window.setTimeout(centerOnLevel, delay)
    );

    return () => {
      window.cancelAnimationFrame(rafId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [focusLevelId, levels.length, completedLevelIds.length]);

  return (
    <section
      ref={scrollerRef}
      className="relative h-full min-h-[calc(100dvh-var(--safe-top)-12rem)] overflow-y-auto overflow-x-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(74,222,255,0.16),transparent_24%),linear-gradient(180deg,rgba(7,11,28,0.98),rgba(2,6,23,0.96))] p-4 shadow-[0_30px_120px_rgba(2,6,23,0.7)] sm:min-h-0 sm:h-auto sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18),transparent_1.4%),radial-gradient(circle_at_72%_28%,rgba(255,255,255,0.14),transparent_1%),radial-gradient(circle_at_35%_62%,rgba(255,255,255,0.16),transparent_1.2%),radial-gradient(circle_at_84%_74%,rgba(255,255,255,0.12),transparent_1%),radial-gradient(circle_at_52%_88%,rgba(255,255,255,0.14),transparent_1%)]" />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent" />
      </div>

      <div className="relative mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            Star Route
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Choose your next orbit
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Every 50 levels opens a new planet. Follow the route, clear nodes, and jump
            forward through the system like a puzzle campaign map.
          </p>
        </div>

        <div className="hidden gap-3 sm:grid-cols-3 lg:grid">
          <MapStat
            label="Completed"
            value={`${completedLevelIds.length}`}
            tone="text-emerald-200"
          />
          <MapStat
            label="Current Orbit"
            value={`Level ${currentLevelId}`}
            tone="text-cyan-200"
          />
          <MapStat
            label="Planet"
            value={`#${Math.floor((currentLevelId - 1) / LEVELS_PER_PLANET) + 1}`}
            tone="text-amber-200"
          />
        </div>
      </div>

      <div className="space-y-8">
        {sectors.map((sector) => {
          const sectorCompleted = sector.levels.filter((level) => completed.has(level.id)).length;
          const isCurrentPlanet =
            currentLevelId >= sector.startLevel && currentLevelId <= sector.endLevel;
          const constellation = buildConstellationLayout(
            sector.index,
            sector.levels.length,
            isPhoneViewport,
            isTabletViewport
          );

          return (
            <article
              key={sector.index}
              className={`relative overflow-hidden rounded-[32px] border p-5 sm:p-6 ${
                isCurrentPlanet
                  ? "border-cyan-300/30 bg-slate-950/70"
                  : "border-white/8 bg-slate-950/50"
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${sector.theme.aura}`}
              />

              <div className="relative mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                      {sector.theme.name}
                    </div>
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Levels {sector.startLevel}-{sector.endLevel}
                    </div>
                  </div>

                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {sector.theme.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {sector.theme.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Cleared here
                    </div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {sectorCompleted}/{sector.levels.length}
                    </div>
                  </div>

                  <div className="relative h-20 w-20">
                    <div
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${sector.theme.surface} opacity-95`}
                    />
                    <div
                      className={`absolute inset-[-10%] rounded-full border ${sector.theme.ring}`}
                    />
                    <div className="absolute inset-[22%] rounded-full bg-black/18" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-x-auto">
                <div
                  className="relative w-full"
                  style={{ height: `${constellation.height}px` }}
                >
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox={`0 0 100 ${constellation.height}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {constellation.positions.map((position, index) => (
                      <g key={`guide-${index}`}>
                        <circle
                          cx={position.renderX}
                          cy={position.y}
                          r="1.7"
                          fill={sector.theme.trail}
                          opacity="0.18"
                        />
                        <circle
                          cx={position.renderX}
                          cy={position.y}
                          r="0.48"
                          fill="white"
                          opacity="0.7"
                        />
                      </g>
                    ))}

                    {constellation.edges.map(([from, to], index) => (
                      <line
                        key={`${from}-${to}-${index}`}
                        x1={constellation.positions[from].renderX}
                        y1={constellation.positions[from].y}
                        x2={constellation.positions[to].renderX}
                        y2={constellation.positions[to].y}
                        stroke={sector.theme.trail}
                        strokeWidth="1.15"
                        strokeLinecap="round"
                        strokeDasharray="2.4 1.6"
                        opacity="0.82"
                      />
                    ))}
                  </svg>

                  {sector.levels.map((level, index) => {
                    const position = constellation.positions[index];
                    const isCompleted = completed.has(level.id);
                    const isCurrent = level.id === currentLevelId;
                    const isUnlocked = level.id <= highestUnlockedId;
                    const isDaily = dailyLevelId === level.id;
                    const earnedStars = starsByLevel[String(level.id)] ?? 0;

                    return (
                      <div
                        key={level.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${position.renderX}%`,
                          top: `${position.y}px`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isUnlocked) {
                              onSelectLevel(level.id);
                            }
                          }}
                          disabled={!isUnlocked}
                          className={[
                            "relative flex h-11 w-11 flex-col items-center justify-center rounded-full border text-center transition duration-200 sm:h-14 sm:w-14 md:h-[3.8rem] md:w-[3.8rem] lg:h-16 lg:w-16",
                            isUnlocked
                              ? "cursor-pointer hover:scale-105"
                              : "cursor-not-allowed opacity-55",
                            isCompleted
                              ? "border-emerald-200/40 bg-emerald-300/18 text-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.28)]"
                              : isCurrent
                              ? `border-cyan-200/50 bg-cyan-300/20 text-white ${sector.theme.activeGlow}`
                              : isUnlocked
                              ? "border-slate-300/20 bg-slate-800/85 text-slate-100"
                              : "border-slate-700/60 bg-slate-900/85 text-slate-500",
                          ].join(" ")}
                          data-level-id={level.id}
                          aria-label={`Level ${level.id}${isUnlocked ? "" : ", locked"}`}
                        >
                          <span className="pointer-events-none absolute inset-[-12%] rounded-full bg-white/8 blur-md" />
                          <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-300/80 sm:text-[9px] md:text-[10px] lg:text-[10px]">
                            Lvl
                          </span>
                          <span className="text-xs font-semibold sm:text-base md:text-lg lg:text-lg">
                            {level.id}
                          </span>
                          {isDaily && (
                            <span className="absolute -right-1 -top-1 rounded-full border border-cyan-200/40 bg-cyan-300 px-1 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-950 sm:px-1.5 sm:text-[8px] lg:text-[9px]">
                              Daily
                            </span>
                          )}
                        </button>

                        <div className="mt-1.5 flex h-5 items-center justify-center gap-0.5">
                          {Array.from({ length: 3 }, (_, starIndex) => (
                            <span
                              key={`${level.id}-star-${starIndex}`}
                              className={
                                starIndex < earnedStars
                                  ? "text-[10px] text-amber-300 sm:text-xs md:text-sm"
                                  : "text-[10px] text-slate-600 sm:text-xs md:text-sm"
                              }
                              aria-hidden="true"
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function buildPlanetSectors(levels: Level[]): PlanetSector[] {
  const sectorCount = Math.ceil(levels.length / LEVELS_PER_PLANET);

  return Array.from({ length: sectorCount }, (_, index) => {
    const start = index * LEVELS_PER_PLANET;
    const sectorLevels = levels.slice(start, start + LEVELS_PER_PLANET);
    const theme = PLANET_THEMES[index % PLANET_THEMES.length];

    return {
      index,
      startLevel: sectorLevels[0]?.id ?? start + 1,
      endLevel: sectorLevels.at(-1)?.id ?? start + LEVELS_PER_PLANET,
      levels: sectorLevels,
      theme,
    };
  });
}

function MapStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function buildConstellationLayout(
  sectorIndex: number,
  count: number,
  isPhoneViewport = false,
  isTabletViewport = false
) {
  const positions: Array<{ x: number; y: number; mobileX: number; tabletX: number; renderX: number }> = [];
  const edges: Array<[number, number]> = [];
  const clusterTotal = Math.ceil(count / 10);
  const mobileXScale = isPhoneViewport ? 0.62 : MOBILE_X_SCALE;
  const tabletXScale = isTabletViewport ? 1.02 : 1;
  const yScale = isTabletViewport ? 2.9 : 2.5;
  const clusterHeight = isTabletViewport ? 340 : CLUSTER_HEIGHT;
  const clusterGap = isTabletViewport ? 98 : CLUSTER_GAP;
  const xStretch = isTabletViewport ? 1.06 : 1;
  const height = TOP_OFFSET + clusterTotal * clusterHeight + (clusterTotal - 1) * clusterGap;

  for (let clusterIndex = 0; clusterIndex < clusterTotal; clusterIndex++) {
    const template =
      CONSTELLATION_TEMPLATES[(sectorIndex + clusterIndex) % CONSTELLATION_TEMPLATES.length];
    const clusterStart = clusterIndex * 10;
    const pointsInCluster = Math.min(10, count - clusterStart);
    const yOffset = TOP_OFFSET + clusterIndex * (clusterHeight + clusterGap);
    const xShift = clusterIndex % 2 === 0 ? 0 : 6;

    for (let pointIndex = 0; pointIndex < pointsInCluster; pointIndex++) {
      const point = template.points[pointIndex];
      const stretchedX = MOBILE_X_CENTER + (point.x + xShift - MOBILE_X_CENTER) * xStretch;
      const desktopX = Math.min(88, Math.max(12, stretchedX));
      const mobileX = MOBILE_X_CENTER + (desktopX - MOBILE_X_CENTER) * mobileXScale;
      const tabletX = MOBILE_X_CENTER + (desktopX - MOBILE_X_CENTER) * tabletXScale;
      const renderX = isPhoneViewport ? mobileX : isTabletViewport ? tabletX : desktopX;

      positions.push({
        x: desktopX,
        mobileX,
        tabletX,
        renderX,
        y: yOffset + point.y * yScale,
      });
    }

    template.edges.forEach(([from, to]) => {
      if (from < pointsInCluster && to < pointsInCluster) {
        edges.push([clusterStart + from, clusterStart + to]);
      }
    });

    if (clusterIndex > 0) {
      edges.push([clusterStart - 1, clusterStart]);
    }
  }

  return { positions, edges, height };
}
