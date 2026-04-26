"use client";

import { Capacitor } from "@capacitor/core";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import LevelPlayer from "@/components/LevelPlayer";
import SpaceLevelMap from "@/components/SpaceLevelMap";
import UsernameGate from "@/components/UsernameGate";
import { showRewardedFuelAd } from "@/lib/admob";
import { getCurrentIdentity, onAuthStateChange, signOutUser } from "@/lib/auth";
import { buildDailyPuzzle, getTodayDailyKey } from "@/lib/daily";
import { levels } from "@/lib/levels";
import {
  isNativePurchasePlatform,
  loadStoreProducts,
  purchaseStoreItem,
  STORE_CATALOG,
  type LoadedStoreProducts,
  type StoreProductId,
} from "@/lib/purchases";
import {
  consumeDailyPuzzleAttempt,
  getAvailableStars,
  getDailyPuzzleState,
  getFuelState,
  getProgress,
  grantFuel,
  grantStars,
  MAX_FUEL,
  markDailyPuzzleCompleted,
  recordLevelCompletion,
  rehydrateProgress,
  saveProgress,
  setActiveProgressAccount,
  spendStars,
  spendFuel,
  unlockDailyBonusAttempt,
  type Progress,
} from "@/lib/progress";
import {
  getDailyChallenge,
  getProgressLeaderboard,
  getUserProgress,
  syncSharedProgress,
  type ProgressLeaderboardEntry,
} from "@/lib/scores";

export default function HomePage() {
  const [splashComplete, setSplashComplete] = useState(false);
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
  const [username, setUsername] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [dailyLevelId, setDailyLevelId] = useState<number | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<"campaign" | "daily" | null>(null);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [progressLeaderboard, setProgressLeaderboard] = useState<ProgressLeaderboardEntry[]>([]);
  const [dailyAdLoading, setDailyAdLoading] = useState(false);
  const [dailyAdMessage, setDailyAdMessage] = useState<string | null>(null);
  const [starAdLoading, setStarAdLoading] = useState(false);
  const [starAdMessage, setStarAdMessage] = useState<string | null>(null);
  const [utilityMenuOpen, setUtilityMenuOpen] = useState(false);
  const [utilityTab, setUtilityTab] = useState<"daily" | "leaderboard" | "store">("store");
  const [storeProducts, setStoreProducts] = useState<LoadedStoreProducts>({});
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeMessage, setStoreMessage] = useState<string | null>(null);
  const [purchaseLoadingId, setPurchaseLoadingId] = useState<StoreProductId | null>(null);

  const dailyKey = useMemo(() => getTodayDailyKey(), []);
  const dailyPuzzle = useMemo(() => buildDailyPuzzle(dailyKey), [dailyKey]);
  const level = levels[levelIndex];
  const completedLevelIds = progress.completedLevels;
  const availableStars = getAvailableStars(progress);
  const fuelState = getFuelState(progress);
  const activePlanet = Math.floor((level.id - 1) / 50) + 1;
  const dailyPuzzleState = getDailyPuzzleState(dailyKey, progress);
  const overlayLevel = activeOverlay === "daily" ? dailyPuzzle : level;

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      void (async () => {
        if (cancelled) return;

        const identity = await getCurrentIdentity();
        if (cancelled) return;

        await setActiveProgressAccount(identity?.accountId ?? null);
        if (cancelled) return;

        const savedProgress = await rehydrateProgress();
        if (cancelled) return;

        setProgress(savedProgress);
        setLevelIndex(getResumeLevelIndex(savedProgress));
        setAccountId(identity?.accountId ?? null);
        setUsername(identity?.username ?? null);

        setStorageHydrated(true);
      })();
    });

    void Promise.resolve().then(async () => {
      const [daily, leaderboard] = await Promise.all([
        getDailyChallenge(),
        getProgressLeaderboard(),
      ]);

      if (!cancelled && daily?.level_id) {
        setDailyLevelId(daily.level_id);
      }

      if (!cancelled) {
        setProgressLeaderboard(leaderboard);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageHydrated || !username) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const localProgress = getProgress();
      const localHighestCompleted =
        localProgress.completedLevels.length > 0 ? Math.max(...localProgress.completedLevels) : 0;
      const remoteProgress = await getUserProgress(username);

      if (cancelled) return;

      const remoteHighestCompleted = remoteProgress?.highestLevelId ?? 0;
      const mergedHighestCompleted = Math.max(localHighestCompleted, remoteHighestCompleted);
      const mergedProgress = mergeLocalAndRemoteProgress(
        localProgress,
        remoteProgress
          ? {
              completedLevels: remoteHighestCompleted,
              starsByLevel: remoteProgress.starsByLevel,
              totalStarsSpent: remoteProgress.totalStarsSpent,
            }
          : null,
        mergedHighestCompleted
      );

      setProgress(mergedProgress);
      setLevelIndex(getResumeLevelIndex(mergedProgress));

      if (
        localHighestCompleted !== remoteHighestCompleted ||
        JSON.stringify(localProgress.starsByLevel) !== JSON.stringify(mergedProgress.starsByLevel) ||
        localProgress.totalStarsSpent !== mergedProgress.totalStarsSpent
      ) {
        await syncSharedProgress({
          username,
          highestLevelId:
            mergedProgress.completedLevels.length > 0
              ? Math.max(...mergedProgress.completedLevels)
              : 0,
          starsByLevel: mergedProgress.starsByLevel,
          totalStarsSpent: mergedProgress.totalStarsSpent,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storageHydrated, username]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSplashComplete(true);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setProgress(getProgress());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = onAuthStateChange(() => {
      void (async () => {
        const identity = await getCurrentIdentity();
        await setActiveProgressAccount(identity?.accountId ?? null);
        const savedProgress = await rehydrateProgress();
        setProgress(savedProgress);
        setLevelIndex(getResumeLevelIndex(savedProgress));
        setAccountId(identity?.accountId ?? null);
        setUsername(identity?.username ?? null);
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (!event.key?.startsWith("pivot-progress")) return;

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

  useEffect(() => {
    if (!utilityMenuOpen || utilityTab !== "store" || !accountId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!cancelled) {
        setStoreLoading(true);
      }

      try {
        const products = await loadStoreProducts(accountId);

        if (cancelled) {
          return;
        }

        setStoreProducts(products);
        setStoreMessage(
          Object.keys(products).length > 0
            ? null
            : "The store is ready, but no products came back yet. Check RevenueCat product setup."
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStoreMessage(
          error instanceof Error ? error.message : "The store could not be loaded right now."
        );
      } finally {
        if (!cancelled) {
          setStoreLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId, utilityMenuOpen, utilityTab]);

  function selectLevel(levelId: number) {
    const index = levels.findIndex((candidate) => candidate.id === levelId);

    if (index >= 0) {
      setLevelIndex(index);
      setActiveOverlay("campaign");
    }
  }

  function handleLevelComplete(starsEarned: number, elapsedMs: number) {
    let nextProgress = recordLevelCompletion(level.id, starsEarned);

    if (elapsedMs > 30_000) {
      const spentFuelProgress = spendFuel(1);
      if (spentFuelProgress) {
        nextProgress = spentFuelProgress;
      }
    }

    setProgress(nextProgress);

    if (username) {
      void syncSharedProgress({
        username,
        highestLevelId: Math.max(...nextProgress.completedLevels),
        starsByLevel: nextProgress.starsByLevel,
        totalStarsSpent: nextProgress.totalStarsSpent,
      });
    }
  }

  function handleAdvanceToNextLevel() {
    setLevelIndex((prev) => Math.min(prev + 1, levels.length - 1));
  }

  function handleSpendHintStar() {
    const nextProgress = spendStars(1);

    if (!nextProgress) {
      return false;
    }

    setProgress(nextProgress);

    if (username) {
      void syncSharedProgress({
        username,
        highestLevelId:
          nextProgress.completedLevels.length > 0 ? Math.max(...nextProgress.completedLevels) : 0,
        starsByLevel: nextProgress.starsByLevel,
        totalStarsSpent: nextProgress.totalStarsSpent,
      });
    }

    return true;
  }

  async function handleWatchAdForFuel() {
    const rewarded = await showRewardedFuelAd();

    if (!rewarded) {
      return false;
    }

    const nextProgress = grantFuel(1);
    setProgress(nextProgress);
    return true;
  }

  async function handleWatchAdForStars() {
    setStarAdLoading(true);
    setStarAdMessage(null);

    try {
      const rewarded = await showRewardedFuelAd();

      if (!rewarded) {
        setStarAdMessage("The rewarded ad did not complete, so no star was added.");
        return false;
      }

      const nextProgress = grantStars(1);
      setProgress(nextProgress);
      setStarAdMessage("+1 star added.");

      if (username) {
        void syncSharedProgress({
          username,
          highestLevelId:
            nextProgress.completedLevels.length > 0 ? Math.max(...nextProgress.completedLevels) : 0,
          starsByLevel: nextProgress.starsByLevel,
          totalStarsSpent: nextProgress.totalStarsSpent,
        });
      }

      return true;
    } catch (error) {
      setStarAdMessage(
        error instanceof Error ? error.message : "Rewarded ads could not be loaded right now."
      );
      return false;
    } finally {
      setStarAdLoading(false);
    }
  }

  async function handleWatchAdForDailyAttempt() {
    setDailyAdLoading(true);
    setDailyAdMessage(null);

    try {
      const rewarded = await showRewardedFuelAd();

      if (!rewarded) {
        setDailyAdMessage("The rewarded ad did not complete, so no extra attempt was granted.");
        return false;
      }

      const nextProgress = unlockDailyBonusAttempt(dailyKey);

      if (!nextProgress) {
        setDailyAdMessage("Your extra daily attempt is already unlocked.");
        return false;
      }

      setProgress(nextProgress);
      setDailyAdMessage("Extra daily attempt unlocked.");
      setActiveOverlay("daily");
      return true;
    } catch (error) {
      setDailyAdMessage(
        error instanceof Error ? error.message : "Rewarded ads could not be loaded right now."
      );
      return false;
    } finally {
      setDailyAdLoading(false);
    }
  }

  async function handleConsumeDailyAttempt() {
    const nextProgress = consumeDailyPuzzleAttempt(dailyKey);

    if (!nextProgress) {
      return false;
    }

    setProgress(nextProgress);
    return true;
  }

  function handleDailyPuzzleComplete(elapsedMs: number) {
    const nextProgress = markDailyPuzzleCompleted(dailyKey, elapsedMs);
    setProgress(nextProgress);
  }

  async function handleShareDailyPuzzle() {
    const dailyBestTimeMs = progress.dailyBestTimeMsByDate[dailyKey];
    const puzzleDescriptor = `8x8 ${dailyPuzzle.type === "chromatic" ? "two-color" : "transform"} challenge`;
    const shareText =
      typeof dailyBestTimeMs === "number"
        ? `I solved today's Pivot Galaxy daily puzzle in ${formatShareTime(dailyBestTimeMs)}. It's an ${puzzleDescriptor}. Can you beat me?`
        : `Today's Pivot Galaxy daily puzzle is live. It's an ${puzzleDescriptor}. Can you solve it?`;

    const shareUrl = typeof window !== "undefined" ? window.location.origin : "";
    const message = `${shareText} ${shareUrl}`.trim();

    try {
      const platform = Capacitor.getPlatform();

      if (platform === "ios") {
        window.location.href = `sms:&body=${encodeURIComponent(message)}`;
        return;
      }

      if (platform === "android") {
        window.location.href = `sms:?body=${encodeURIComponent(message)}`;
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: "Pivot Galaxy Daily Puzzle",
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(message);
        setDailyAdMessage("Daily puzzle text copied. Paste it into a message.");
      }
    } catch {}
  }

  function closeLevelOverlay() {
    setActiveOverlay(null);
  }

  async function handleStorePurchase(productId: StoreProductId) {
    if (!accountId) {
      setStoreMessage("Sign in again before making a purchase.");
      return;
    }

    setPurchaseLoadingId(productId);
    setStoreMessage(null);

    try {
      const reward = await purchaseStoreItem(accountId, productId, storeProducts);
      let nextProgress = getProgress();

      if (reward.fuel > 0) {
        nextProgress = grantFuel(reward.fuel);
      }

      if (reward.stars > 0) {
        nextProgress = grantStars(reward.stars);
      }

      setProgress(nextProgress);

      if (username && reward.stars > 0) {
        void syncSharedProgress({
          username,
          highestLevelId:
            nextProgress.completedLevels.length > 0 ? Math.max(...nextProgress.completedLevels) : 0,
          starsByLevel: nextProgress.starsByLevel,
          totalStarsSpent: nextProgress.totalStarsSpent,
        });
      }

      setStoreMessage(
        reward.fuel > 0
          ? `${reward.fuel} fuel added. Extra fuel is stored and auto-refills your tank as you play.`
          : `${reward.stars} stars added to your account.`
      );
    } catch (error) {
      const purchaseError = error as { userCancelled?: boolean } | Error;
      if ("userCancelled" in purchaseError && purchaseError.userCancelled) {
        setStoreMessage("Purchase cancelled.");
      } else {
        setStoreMessage(
          error instanceof Error ? error.message : "That purchase could not be completed."
        );
      }
    } finally {
      setPurchaseLoadingId(null);
    }
  }

  useEffect(() => {
    if (!activeOverlay) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveOverlay(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeOverlay]);

  if (!storageHydrated || !splashComplete) {
    return (
      <main className="safe-shell flex min-h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_20%),radial-gradient(circle_at_20%_18%,rgba(251,191,36,0.1),transparent_18%),linear-gradient(180deg,#030712_0%,#091127_48%,#020617_100%)] text-white">
        <div className="relative flex flex-col items-center justify-center text-center">
          <div className="pointer-events-none absolute -top-10 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-gradient-to-br from-fuchsia-200/50 via-violet-400/40 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -left-10 top-8 h-16 w-16 rounded-full bg-gradient-to-br from-amber-200 via-orange-400 to-rose-500 opacity-90 shadow-[0_0_40px_rgba(251,146,60,0.42)]" />
          <div className="pointer-events-none absolute -right-8 top-20 h-12 w-12 rounded-full bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-600 opacity-90 shadow-[0_0_36px_rgba(56,189,248,0.38)]" />

          <div className="text-[clamp(3.75rem,11vw,7.5rem)] font-black uppercase leading-none tracking-[0.16em] text-white">
            Pivot
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-[clamp(2.8rem,9vw,6.4rem)] font-black uppercase leading-none tracking-[0.12em] text-white">
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
          <div className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/90">
            Loading Star Route
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="safe-shell flex min-h-dvh flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_18%),radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.08),transparent_18%),linear-gradient(180deg,#030712_0%,#091127_48%,#020617_100%)] py-6 text-white sm:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <header className="fixed left-0 right-0 top-[calc(var(--safe-top)+1.85rem)] z-50 mx-auto w-[calc(100%-max(2rem,var(--safe-left))-max(2rem,var(--safe-right)))] max-w-7xl bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_52%),linear-gradient(180deg,rgba(7,17,39,0.78),rgba(6,13,30,0.68))] px-2 py-3 backdrop-blur-md sm:top-[calc(var(--safe-top)+1.25rem)] sm:px-4">
          <div className="pointer-events-none absolute left-[6%] top-6 h-14 w-14 rounded-full bg-gradient-to-br from-amber-200 via-orange-400 to-rose-500 opacity-85 shadow-[0_0_40px_rgba(251,146,60,0.45)] sm:h-20 sm:w-20" />
          <div className="pointer-events-none absolute right-[10%] top-16 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-600 opacity-85 shadow-[0_0_36px_rgba(56,189,248,0.4)] sm:h-16 sm:w-16" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-br from-fuchsia-200/60 via-violet-400/50 to-transparent blur-2xl" />

          <div className="relative">
            {username ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-2xl font-black uppercase leading-none tracking-[0.12em] text-white sm:text-3xl">
                    Pivot Galaxy
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CompactResourcePill
                    icon={<FuelIcon />}
                    label="Fuel"
                    value={`${fuelState.fuel}/${MAX_FUEL}`}
                    className="border-rose-200/25 bg-[linear-gradient(135deg,rgba(251,113,133,0.22),rgba(244,63,94,0.12))] text-rose-50"
                    iconClassName="bg-rose-100 text-rose-600"
                  />
                  <CompactResourcePill
                    icon={<StarIcon />}
                    label="Stars"
                    value={String(availableStars)}
                    className="border-amber-200/30 bg-[linear-gradient(135deg,rgba(251,191,36,0.24),rgba(249,115,22,0.14))] text-amber-50"
                    iconClassName="bg-amber-100 text-amber-600"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center">
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

                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  Sign in once to save your puzzle progress, stars, and fuel on this device.
                </p>
              </div>
            )}
          </div>
        </header>

        <div className="h-40 sm:h-44" aria-hidden="true" />

        {!username && storageHydrated && (
          <section className="mt-4 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,31,0.96),rgba(6,11,22,0.94))] p-5 shadow-[0_24px_90px_rgba(2,6,23,0.45)]">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Pilot Account
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Create an Account or Sign In
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Use email and password so your username, progress, stars, fuel, and daily challenge results stay tied to your account.
              </p>
              <div className="mt-5">
                <UsernameGate username={username} onUsernameSet={setUsername} />
              </div>
            </div>
          </section>
        )}

        {username && (
          <div className="mt-4 flex min-h-0 flex-1">
            <SpaceLevelMap
              levels={levels}
              currentLevelId={level.id}
              focusLevelId={level.id}
              completedLevelIds={completedLevelIds}
              starsByLevel={progress.starsByLevel}
              dailyLevelId={dailyLevelId}
              onSelectLevel={selectLevel}
            />
          </div>
        )}
      </div>

      {username && utilityMenuOpen && (
        <div className="fixed right-[max(1rem,var(--safe-right))] top-[calc(var(--safe-top)+6.4rem)] z-40 sm:top-[calc(var(--safe-top)+6.8rem)]">
          <div className="mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,31,0.98),rgba(6,11,22,0.98))] p-4 shadow-[0_28px_90px_rgba(2,6,23,0.55)] backdrop-blur-xl">
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setUtilityTab("store")}
                  className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    utilityTab === "store"
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                  }`}
                >
                  Store
                </button>
                <button
                  type="button"
                  onClick={() => setUtilityTab("daily")}
                  className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    utilityTab === "daily"
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setUtilityTab("leaderboard")}
                  className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    utilityTab === "leaderboard"
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                  }`}
                >
                  Leaderboard
                </button>
              </div>

              {utilityTab === "store" ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                    Orbit Store
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-white">Fuel and Star Packs</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Fuel refills instantly, and extra purchased fuel stays in reserve so it can
                    keep topping up your tank later.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                    <DailyTag label={`${fuelState.fuel}/${MAX_FUEL} Fuel Live`} />
                    {(fuelState.reserveFuel ?? 0) > 0 && (
                      <DailyTag label={`${fuelState.reserveFuel ?? 0} Fuel Stored`} highlight />
                    )}
                  </div>

                  <div className="mt-4 grid gap-3">
                    {STORE_CATALOG.map((item) => (
                      <StoreItemCard
                        key={item.productId}
                        title={item.title}
                        subtitle={item.subtitle}
                        priceLabel={storeProducts[item.productId]?.priceString ?? "Loading..."}
                        accent={
                          item.productId === "stars_20"
                            ? "from-amber-200/25 via-yellow-400/14 to-transparent"
                            : item.productId === "fuel_15"
                              ? "from-orange-300/25 via-rose-400/12 to-transparent"
                              : "from-rose-300/25 via-rose-400/12 to-transparent"
                        }
                        icon={item.productId === "stars_20" ? <StarIcon /> : <FuelIcon />}
                        buttonLabel={
                          purchaseLoadingId === item.productId
                            ? "Purchasing..."
                            : isNativePurchasePlatform()
                              ? "Buy Pack"
                              : "Mobile Only"
                        }
                        onClick={() => handleStorePurchase(item.productId)}
                        disabled={
                          purchaseLoadingId !== null ||
                          !isNativePurchasePlatform() ||
                          !storeProducts[item.productId]
                        }
                      />
                    ))}
                  </div>

                  {(storeLoading || storeMessage) && (
                    <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
                      {storeLoading ? "Loading store products..." : storeMessage}
                    </div>
                  )}
                </div>
              ) : utilityTab === "daily" ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                    Daily Puzzle
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-white">Today’s 8x8 Challenge</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{dailyPuzzle.prompt}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <DailyTag
                      label={dailyPuzzle.type === "chromatic" ? "Two Colors" : "One Color"}
                    />
                    <DailyTag label="8x8" />
                    <DailyTag
                      label={`${dailyPuzzleState.attemptsRemaining} Attempt${
                        dailyPuzzleState.attemptsRemaining === 1 ? "" : "s"
                      } Left`}
                    />
                    {dailyPuzzleState.completed && <DailyTag label="Completed Today" highlight />}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveOverlay("daily");
                        setUtilityMenuOpen(false);
                      }}
                      disabled={dailyPuzzleState.attemptsRemaining <= 0}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        dailyPuzzleState.attemptsRemaining > 0
                          ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                          : "cursor-not-allowed bg-slate-700 text-slate-400"
                      }`}
                    >
                      Play Daily
                    </button>
                    <button
                      type="button"
                      onClick={handleShareDailyPuzzle}
                      className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/18"
                    >
                      Share via Text
                    </button>
                  </div>

                  {dailyPuzzleState.attemptsRemaining <= 0 &&
                    !dailyPuzzleState.bonusAttemptUsed &&
                    !dailyPuzzleState.completed && (
                      <button
                        type="button"
                        onClick={handleWatchAdForDailyAttempt}
                        disabled={dailyAdLoading}
                        className="mt-3 w-full rounded-2xl border border-amber-300/30 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/22"
                      >
                        {dailyAdLoading
                          ? "Loading Rewarded Ad..."
                          : "Watch Ad for 1 More Attempt"}
                      </button>
                    )}

                  {dailyAdMessage && (
                    <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                      {dailyAdMessage}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                    Galaxy Progress
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-white">Top Pilots</h2>
                  <div className="mt-4 space-y-2">
                    {progressLeaderboard.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                        No progress recorded yet.
                      </div>
                    ) : (
                      progressLeaderboard.map((entry, index) => (
                        <div
                          key={`${entry.username}-${entry.highestLevelId}-${index}`}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
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
                </div>
              )}

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Star Boost
                  </div>
                  <button
                    type="button"
                    onClick={handleWatchAdForStars}
                    disabled={starAdLoading}
                    className="mt-3 w-full rounded-2xl border border-amber-300/30 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/22 disabled:cursor-wait disabled:opacity-80"
                  >
                    {starAdLoading ? "Loading Rewarded Ad..." : "Watch Ad for +1 Star"}
                  </button>
                  {starAdMessage && (
                    <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                      {starAdMessage}
                    </div>
                  )}
                </div>

                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Signed in as
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{username}</div>
                <button
                  type="button"
                  onClick={() => {
                    void signOutUser();
                    setUtilityMenuOpen(false);
                  }}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Sign Out
                </button>
              </div>
          </div>
        </div>
      )}

      {username && (
        <button
          type="button"
          onClick={() => setUtilityMenuOpen((open) => !open)}
          className="fixed bottom-[calc(var(--safe-bottom)+1.25rem)] right-[max(1rem,var(--safe-right))] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/25 bg-[linear-gradient(180deg,rgba(34,211,238,0.22),rgba(14,116,144,0.24))] text-cyan-100 shadow-[0_12px_28px_rgba(2,6,23,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:bg-cyan-300/20"
          aria-label="Open daily puzzle and leaderboard menu"
        >
          <RocketIcon />
        </button>
      )}

      {activeOverlay && (
        <div
          className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 backdrop-blur-sm"
          onClick={closeLevelOverlay}
        >
          <div
            className="relative h-full w-full overflow-y-auto rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,30,0.98),rgba(5,10,20,0.98))] px-3 pb-[calc(var(--safe-bottom)+1rem)] pt-3 shadow-[0_35px_140px_rgba(0,0,0,0.72)] sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-[36px] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between sm:mb-5 sm:gap-4 sm:pb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  {activeOverlay === "daily" ? "Daily Puzzle" : "Live Puzzle Window"}
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  {activeOverlay === "daily"
                    ? "Today’s Daily Challenge"
                    : `Planet ${activePlanet}, Level ${level.id}`}
                </h2>
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
              level={overlayLevel}
              username={username}
              availableStars={availableStars}
              availableFuel={fuelState.fuel}
              nextFuelInMs={fuelState.nextFuelInMs}
              startUnitsAvailable={
                activeOverlay === "daily" ? dailyPuzzleState.attemptsRemaining : undefined
              }
              startButtonLabel={activeOverlay === "daily" ? "Start Daily Puzzle" : undefined}
              lockedStartLabel={activeOverlay === "daily" ? "No Attempts Left" : undefined}
              instructionSuffix={
                activeOverlay === "daily"
                  ? "You get 1 attempt each day. Watch an ad if you need one extra try."
                  : "Finish within 30 seconds to avoid spending fuel."
              }
              showLeaderboard={activeOverlay !== "daily"}
              showReplayButton={activeOverlay !== "daily"}
              showNextLevelButton={activeOverlay !== "daily"}
              awardsStars={activeOverlay !== "daily"}
              onWatchAdForFuel={
                activeOverlay === "daily" ? handleWatchAdForDailyAttempt : handleWatchAdForFuel
              }
              watchAdLabel={
                activeOverlay === "daily"
                  ? "Watch Ad for 1 More Attempt"
                  : "Watch Ad for +1 Fuel"
              }
              onConsumeStart={activeOverlay === "daily" ? handleConsumeDailyAttempt : undefined}
              onSpendHintStar={handleSpendHintStar}
              onComplete={(starsEarned, elapsedMs) => {
                if (activeOverlay === "daily") {
                  handleDailyPuzzleComplete(elapsedMs);
                  return;
                }

                handleLevelComplete(starsEarned, elapsedMs);
              }}
              onAdvance={activeOverlay === "daily" ? undefined : handleAdvanceToNextLevel}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function DailyTag({
  label,
  highlight = false,
}: {
  label: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        highlight
          ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-100"
          : "border-white/10 bg-white/5 text-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

function StoreItemCard({
  title,
  subtitle,
  priceLabel,
  accent,
  icon,
  buttonLabel,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  priceLabel: string;
  accent: string;
  icon: ReactNode;
  buttonLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-cyan-100">
              {icon}
            </div>
            <div className="text-base font-semibold text-white">{title}</div>
          </div>
          <div className="mt-2 text-sm text-slate-300">{subtitle}</div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100">
            {priceLabel}
          </div>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function getResumeLevelIndex(progress: Progress) {
  const completed = progress.completedLevels;
  const highestCompleted = completed.length > 0 ? Math.max(...completed) : 0;
  const nextLevelId = Math.min(levels.length, highestCompleted > 0 ? highestCompleted + 1 : 1);

  return Math.max(0, levels.findIndex((level) => level.id === nextLevelId));
}

function mergeLocalAndRemoteProgress(
  progress: Progress,
  remote: {
    completedLevels: number;
    starsByLevel: Record<string, number>;
    totalStarsSpent: number;
  } | null,
  highestCompletedLevel: number
): Progress {
  const safeHighestCompletedLevel = Math.max(0, Math.min(levels.length, highestCompletedLevel));

  const completedSet = new Set(progress.completedLevels);

  for (let levelId = 1; levelId <= safeHighestCompletedLevel; levelId += 1) {
    completedSet.add(levelId);
  }

  const completedLevels = Array.from(completedSet).sort((a, b) => a - b);
  const starsByLevel = mergeStarsByLevel(progress.starsByLevel, remote?.starsByLevel ?? {});
  const totalStarsEarned = Object.values(starsByLevel).reduce((sum, stars) => sum + stars, 0);
  const totalStarsSpent = Math.max(progress.totalStarsSpent, remote?.totalStarsSpent ?? 0);

  const completedUnchanged =
    completedLevels.length === progress.completedLevels.length &&
    completedLevels.every((levelId, index) => levelId === progress.completedLevels[index]);
  const starsUnchanged = JSON.stringify(starsByLevel) === JSON.stringify(progress.starsByLevel);

  if (
    completedUnchanged &&
    starsUnchanged &&
    totalStarsEarned === progress.totalStarsEarned &&
    totalStarsSpent === progress.totalStarsSpent
  ) {
    return progress;
  }

  const nextProgress = {
    ...progress,
    completedLevels,
    starsByLevel,
    totalStarsEarned,
    totalStarsSpent,
  };

  saveProgress(nextProgress);
  return nextProgress;
}

function mergeStarsByLevel(
  localStars: Record<string, number>,
  remoteStars: Record<string, number>
): Record<string, number> {
  const merged = { ...localStars };

  for (const [levelId, stars] of Object.entries(remoteStars)) {
    merged[levelId] = Math.max(merged[levelId] ?? 0, stars);
  }

  return merged;
}

function formatShareTime(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function CompactResourcePill({
  icon,
  label,
  value,
  className,
  iconClassName,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className: string;
  iconClassName: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-2 ${className}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${iconClassName}`}>
        {icon}
      </div>
      <div className="text-left">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-80">
          {label}
        </div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 2.75l2.88 5.84 6.45.94-4.66 4.54 1.1 6.42L12 17.46l-5.77 3.03 1.1-6.42-4.66-4.54 6.45-.94L12 2.75z" />
    </svg>
  );
}

function FuelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.5a2 2 0 0 0-.59-1.41l-1.5-1.5A2 2 0 0 0 13.5 4H7zm1 3h6v4H8V7zm8.83-1.54-.71.71 1.3 1.29c.37.38.58.88.58 1.42V14a1 1 0 1 0 2 0V9.29c0-.79-.31-1.55-.88-2.12l-1.29-1.29z" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
      <defs>
        <linearGradient id="rocketBody" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ff8a65" />
          <stop offset="55%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id="rocketFin" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="rocketFlame" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      <path
        d="M34 6c8 3 15 10 18 18-1 11-6 20-14 28l-8 3-18-18 3-8c8-8 17-13 28-14Z"
        fill="url(#rocketBody)"
      />
      <path d="M19 38 10 47c-3 3-3 7-2 10 3 1 7 1 10-2l9-9-8-8Z" fill="#38bdf8" />
      <path d="M30 49c2 5 1 9-1 12 3-1 7-3 10-6 3-3 5-7 6-10-3 2-7 3-12 4l-3 0Z" fill="url(#rocketFlame)" />
      <path d="M15 22c-5 0-9 1-12 4 3 1 7 3 10 6 3 3 5 7 6 10 1-5 2-9 4-12l-8-8Z" fill="url(#rocketFin)" />
      <path d="M39 13c4 2 8 6 10 10-1 8-5 15-11 21l-4 1-17-17 1-4c6-6 13-10 21-11Z" fill="#f8fafc" opacity="0.95" />
      <circle cx="37" cy="27" r="5.5" fill="#38bdf8" />
      <circle cx="37" cy="27" r="2.5" fill="#e0f2fe" />
      <path d="M14 50c-1 2-1 4 0 6 2 1 4 1 6 0-2-2-4-4-6-6Z" fill="#fbbf24" />
      <path d="M50 14c0 1 0 2-1 3l-2-2c1-1 2-1 3-1Z" fill="#fde68a" />
    </svg>
  );
}
