import { getStoredJson, setStoredJson, setStoredString } from "@/lib/storage";

const LEGACY_STORAGE_KEY = "pivot-progress";
const STORAGE_KEY_PREFIX = "pivot-progress:";
const ACTIVE_PROGRESS_ACCOUNT_KEY = "pivot-active-progress-account";
const GUEST_PROGRESS_ACCOUNT = "guest";

export const MAX_FUEL = 5;
export const FUEL_REGEN_MS = 30 * 60 * 1000;

export type Progress = {
  completedLevels: number[];
  starsByLevel: Record<string, number>;
  totalStarsEarned: number;
  totalStarsSpent: number;
  fuel: number;
  fuelReserve: number;
  fuelUpdatedAt: number;
  dailyAttemptsUsedByDate: Record<string, number>;
  dailyBonusAttemptUsedByDate: Record<string, boolean>;
  dailyCompletedByDate: Record<string, boolean>;
  dailyBestTimeMsByDate: Record<string, number>;
};

const EMPTY_PROGRESS: Progress = {
  completedLevels: [],
  starsByLevel: {},
  totalStarsEarned: 0,
  totalStarsSpent: 0,
  fuel: MAX_FUEL,
  fuelReserve: 0,
  fuelUpdatedAt: Date.now(),
  dailyAttemptsUsedByDate: {},
  dailyBonusAttemptUsedByDate: {},
  dailyCompletedByDate: {},
  dailyBestTimeMsByDate: {},
};

export function getProgress(now = Date.now()): Progress {
  if (typeof window === "undefined") {
    return EMPTY_PROGRESS;
  }

  const storageKey = getProgressStorageKey();
  migrateLegacyProgressIfNeeded(storageKey);
  const raw = localStorage.getItem(storageKey);
  const normalized = raw ? normalizeProgress(safeJsonParse(raw)) : EMPTY_PROGRESS;
  const hydrated = hydrateFuel(normalized, now);

  if (raw !== JSON.stringify(hydrated)) {
    saveProgress(hydrated);
  }

  return hydrated;
}

export function saveProgress(progress: Progress) {
  const storageKey = getProgressStorageKey();
  localStorage.setItem(storageKey, JSON.stringify(progress));
  localStorage.setItem(`${STORAGE_KEY_PREFIX}updated-at`, String(Date.now()));
  void setStoredJson(storageKey, progress);
}

export function getAvailableStars(progress = getProgress()) {
  return Math.max(0, progress.totalStarsEarned - progress.totalStarsSpent);
}

export function getFuelState(progress = getProgress(), now = Date.now()) {
  const hydrated = hydrateFuel(progress, now);

  if (hydrated.fuel >= MAX_FUEL) {
    return {
      fuel: MAX_FUEL,
      maxFuel: MAX_FUEL,
      nextFuelInMs: 0,
    };
  }

  const elapsed = Math.max(0, now - hydrated.fuelUpdatedAt);

  return {
    fuel: hydrated.fuel,
    maxFuel: MAX_FUEL,
    reserveFuel: hydrated.fuelReserve,
    nextFuelInMs: Math.max(0, FUEL_REGEN_MS - elapsed),
  };
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

export function spendFuel(amount: number) {
  const progress = getProgress();

  if (amount <= 0 || progress.fuel < amount) {
    return null;
  }

  const now = Date.now();
  const next = {
    ...progress,
    fuel: progress.fuel - amount,
    fuelUpdatedAt: progress.fuel >= MAX_FUEL ? now : progress.fuelUpdatedAt,
  };

  const replenished = applyFuelReserveFill(next, now);
  saveProgress(replenished);
  return replenished;
}

export function grantFuel(amount: number) {
  const progress = getProgress();
  const now = Date.now();
  const normalizedAmount = Math.max(0, Math.floor(amount));
  const liveFuelSpace = Math.max(0, MAX_FUEL - progress.fuel);
  const liveFuelGain = Math.min(liveFuelSpace, normalizedAmount);
  const next = {
    ...progress,
    fuel: progress.fuel + liveFuelGain,
    fuelReserve: progress.fuelReserve + Math.max(0, normalizedAmount - liveFuelGain),
    fuelUpdatedAt: now,
  };

  saveProgress(next);
  return next;
}

export function grantStars(amount: number) {
  const progress = getProgress();
  const next = {
    ...progress,
    totalStarsEarned: progress.totalStarsEarned + Math.max(0, Math.floor(amount)),
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

export function getDailyPuzzleState(dateKey: string, progress = getProgress()) {
  const attemptsUsed = progress.dailyAttemptsUsedByDate[dateKey] ?? 0;
  const bonusAttemptUsed = progress.dailyBonusAttemptUsedByDate[dateKey] ?? false;
  const completed = progress.dailyCompletedByDate[dateKey] ?? false;
  const attemptsGranted = 1 + (bonusAttemptUsed ? 1 : 0);

  return {
    attemptsUsed,
    attemptsGranted,
    attemptsRemaining: Math.max(0, attemptsGranted - attemptsUsed),
    bonusAttemptUsed,
    completed,
  };
}

export function consumeDailyPuzzleAttempt(dateKey: string) {
  const progress = getProgress();
  const dailyState = getDailyPuzzleState(dateKey, progress);

  if (dailyState.attemptsRemaining <= 0) {
    return null;
  }

  const next = normalizeProgress(progress);
  next.dailyAttemptsUsedByDate[dateKey] = dailyState.attemptsUsed + 1;
  saveProgress(next);
  return next;
}

export function unlockDailyBonusAttempt(dateKey: string) {
  const progress = getProgress();
  const next = normalizeProgress(progress);

  if (next.dailyBonusAttemptUsedByDate[dateKey]) {
    return null;
  }

  next.dailyBonusAttemptUsedByDate[dateKey] = true;
  saveProgress(next);
  return next;
}

export function markDailyPuzzleCompleted(dateKey: string, elapsedMs?: number) {
  const progress = getProgress();
  const next = normalizeProgress(progress);
  next.dailyCompletedByDate[dateKey] = true;

  if (typeof elapsedMs === "number" && Number.isFinite(elapsedMs) && elapsedMs >= 0) {
    const previousBest = next.dailyBestTimeMsByDate[dateKey];
    next.dailyBestTimeMsByDate[dateKey] =
      typeof previousBest === "number" ? Math.min(previousBest, elapsedMs) : elapsedMs;
  }

  saveProgress(next);
  return next;
}

export async function rehydrateProgress(now = Date.now()) {
  const storageKey = getProgressStorageKey();
  const stored = await getStoredJson<Progress>(storageKey);
  const hydrated = hydrateFuel(normalizeProgress(stored), now);

  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey, JSON.stringify(hydrated));
  }

  return hydrated;
}

export async function setActiveProgressAccount(accountId: string | null) {
  const nextAccountId = accountId?.trim() || GUEST_PROGRESS_ACCOUNT;

  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_PROGRESS_ACCOUNT_KEY, nextAccountId);
  }

  await setStoredString(ACTIVE_PROGRESS_ACCOUNT_KEY, nextAccountId);
}

function hydrateFuel(progress: Progress, now: number) {
  const reserveFilled = applyFuelReserveFill(progress, now);

  if (reserveFilled.fuel >= MAX_FUEL) {
    return reserveFilled.fuel === MAX_FUEL ? reserveFilled : { ...reserveFilled, fuel: MAX_FUEL };
  }

  const elapsed = Math.max(0, now - reserveFilled.fuelUpdatedAt);
  const gainedFuel = Math.floor(elapsed / FUEL_REGEN_MS);

  if (gainedFuel <= 0) {
    return reserveFilled;
  }

  const fuel = Math.min(MAX_FUEL, reserveFilled.fuel + gainedFuel);
  const remainder = elapsed % FUEL_REGEN_MS;

  return {
    ...reserveFilled,
    fuel,
    fuelUpdatedAt: fuel >= MAX_FUEL ? now : now - remainder,
  };
}

function applyFuelReserveFill(progress: Progress, now: number) {
  if (progress.fuel >= MAX_FUEL || progress.fuelReserve <= 0) {
    return progress;
  }

  const refillAmount = Math.min(MAX_FUEL - progress.fuel, progress.fuelReserve);

  return {
    ...progress,
    fuel: progress.fuel + refillAmount,
    fuelReserve: progress.fuelReserve - refillAmount,
    fuelUpdatedAt: now,
  };
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
    fuel:
      typeof progress.fuel === "number"
        ? Math.max(0, Math.min(MAX_FUEL, Math.floor(progress.fuel)))
        : MAX_FUEL,
    fuelReserve:
      typeof progress.fuelReserve === "number" ? Math.max(0, Math.floor(progress.fuelReserve)) : 0,
    fuelUpdatedAt:
      typeof progress.fuelUpdatedAt === "number" ? progress.fuelUpdatedAt : Date.now(),
    dailyAttemptsUsedByDate:
      progress.dailyAttemptsUsedByDate &&
      typeof progress.dailyAttemptsUsedByDate === "object"
        ? Object.fromEntries(
            Object.entries(progress.dailyAttemptsUsedByDate).filter(
              ([key, value]) => typeof key === "string" && typeof value === "number"
            )
          )
        : {},
    dailyBonusAttemptUsedByDate:
      progress.dailyBonusAttemptUsedByDate &&
      typeof progress.dailyBonusAttemptUsedByDate === "object"
        ? Object.fromEntries(
            Object.entries(progress.dailyBonusAttemptUsedByDate).filter(
              ([key, value]) => typeof key === "string" && typeof value === "boolean"
            )
          )
        : {},
    dailyCompletedByDate:
      progress.dailyCompletedByDate && typeof progress.dailyCompletedByDate === "object"
        ? Object.fromEntries(
            Object.entries(progress.dailyCompletedByDate).filter(
              ([key, value]) => typeof key === "string" && typeof value === "boolean"
            )
          )
        : {},
    dailyBestTimeMsByDate:
      progress.dailyBestTimeMsByDate && typeof progress.dailyBestTimeMsByDate === "object"
        ? Object.fromEntries(
            Object.entries(progress.dailyBestTimeMsByDate).filter(
              ([key, value]) => typeof key === "string" && typeof value === "number"
            )
          )
        : {},
  };
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getProgressStorageKey() {
  if (typeof window === "undefined") {
    return `${STORAGE_KEY_PREFIX}${GUEST_PROGRESS_ACCOUNT}`;
  }

  const accountId =
    localStorage.getItem(ACTIVE_PROGRESS_ACCOUNT_KEY)?.trim() || GUEST_PROGRESS_ACCOUNT;
  return `${STORAGE_KEY_PREFIX}${accountId}`;
}

function migrateLegacyProgressIfNeeded(storageKey: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(storageKey)) return;

  const legacyValue = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyValue) return;

  localStorage.setItem(storageKey, legacyValue);
}
