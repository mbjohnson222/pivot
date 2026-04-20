const STORAGE_KEY = "pivot-progress";

export type Progress = {
  completedLevels: number[];
  starsByLevel: Record<string, number>;
  totalStarsEarned: number;
  totalStarsSpent: number;
};

const EMPTY_PROGRESS: Progress = {
  completedLevels: [],
  starsByLevel: {},
  totalStarsEarned: 0,
  totalStarsSpent: 0,
};

export function getProgress(): Progress {
  if (typeof window === "undefined") {
    return EMPTY_PROGRESS;
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return EMPTY_PROGRESS;

  try {
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(progress: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getAvailableStars(progress = getProgress()) {
  return Math.max(0, progress.totalStarsEarned - progress.totalStarsSpent);
}

export function spendStars(amount: number) {
  const progress = getProgress();

  if (amount <= 0 || getAvailableStars(progress) < amount) {
    return null;
  }

  const next = {
    ...progress,
    totalStarsSpent: progress.totalStarsSpent + amount,
  };

  saveProgress(next);
  return next;
}

export function recordLevelCompletion(levelId: number, starsEarned: number) {
  const progress = getProgress();
  const next = normalizeProgress(progress);
  const levelKey = String(levelId);
  const previousBest = next.starsByLevel[levelKey] ?? 0;
  const clampedStars = Math.max(1, Math.min(3, Math.floor(starsEarned)));

  if (!next.completedLevels.includes(levelId)) {
    next.completedLevels.push(levelId);
    next.completedLevels.sort((a, b) => a - b);
  }

  if (clampedStars > previousBest) {
    next.starsByLevel[levelKey] = clampedStars;
    next.totalStarsEarned += clampedStars - previousBest;
  }

  saveProgress(next);
  return next;
}

export function markLevelComplete(levelId: number) {
  const progress = getProgress();

  if (!progress.completedLevels.includes(levelId)) {
    const next = {
      ...progress,
      completedLevels: [...progress.completedLevels, levelId].sort((a, b) => a - b),
    };
    saveProgress(next);
    return next;
  }

  return progress;
}

function normalizeProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== "object") {
    return EMPTY_PROGRESS;
  }

  const progress = raw as Partial<Progress>;

  return {
    completedLevels: Array.isArray(progress.completedLevels)
      ? progress.completedLevels.filter((value): value is number => typeof value === "number")
      : [],
    starsByLevel:
      progress.starsByLevel && typeof progress.starsByLevel === "object"
        ? Object.fromEntries(
            Object.entries(progress.starsByLevel).filter(
              ([key, value]) => typeof key === "string" && typeof value === "number"
            )
          )
        : {},
    totalStarsEarned:
      typeof progress.totalStarsEarned === "number" ? progress.totalStarsEarned : 0,
    totalStarsSpent: typeof progress.totalStarsSpent === "number" ? progress.totalStarsSpent : 0,
  };
}
