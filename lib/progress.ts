const STORAGE_KEY = "pivot-progress";

export type Progress = {
  completedLevels: number[];
};

export function getProgress(): Progress {
  if (typeof window === "undefined") {
    return { completedLevels: [] };
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return { completedLevels: [] };

  try {
    return JSON.parse(raw);
  } catch {
    return { completedLevels: [] };
  }
}

export function saveProgress(progress: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markLevelComplete(levelId: number) {
  const progress = getProgress();

  if (!progress.completedLevels.includes(levelId)) {
    progress.completedLevels.push(levelId);
    saveProgress(progress);
  }
}