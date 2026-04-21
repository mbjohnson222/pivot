import { supabase } from "@/lib/supabase/client";

export type LeaderboardEntry = {
  username: string;
  moves: number;
  timeMs: number;
  createdAt: string;
};

export type ProgressLeaderboardEntry = {
  username: string;
  highestLevelId: number;
  updatedAt: string;
};

export type SharedUserProgress = ProgressLeaderboardEntry & {
  starsByLevel: Record<string, number>;
  totalStarsEarned: number;
  totalStarsSpent: number;
};

export async function getLevelLeaderboard(levelId: number): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("level_scores")
    .select("username, moves, time_ms, created_at")
    .eq("level_id", levelId)
    .order("time_ms", { ascending: true })
    .order("moves", { ascending: true })
    .limit(10);

  if (error) {
    console.error("getLevelLeaderboard error:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => ({
    username: row.username,
    moves: row.moves,
    timeMs: row.time_ms,
    createdAt: row.created_at,
  }));
}

export async function getProgressLeaderboard(): Promise<ProgressLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("user_progress")
    .select("username, highest_level_id, updated_at")
    .order("highest_level_id", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(25);

  if (error) {
    console.error("getProgressLeaderboard error:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => ({
    username: row.username,
    highestLevelId: row.highest_level_id,
    updatedAt: row.updated_at,
  }));
}

export async function getUserProgress(username: string): Promise<SharedUserProgress | null> {
  const trimmed = username.trim();

  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("user_progress")
    .select("username, highest_level_id, updated_at, stars_by_level, total_stars_earned, total_stars_spent")
    .eq("username", trimmed)
    .maybeSingle();

  if (error) {
    console.error("getUserProgress error:", error);
    return null;
  }

  if (!data) return null;

  return {
    username: data.username,
    highestLevelId: data.highest_level_id,
    updatedAt: data.updated_at,
    starsByLevel: normalizeStarsByLevel(data.stars_by_level),
    totalStarsEarned:
      typeof data.total_stars_earned === "number" ? Math.max(0, data.total_stars_earned) : 0,
    totalStarsSpent:
      typeof data.total_stars_spent === "number" ? Math.max(0, data.total_stars_spent) : 0,
  };
}

export async function updateHighestLevel(username: string, levelId: number) {
  const trimmed = username.trim();

  if (!trimmed) return false;

  const { data: existing, error: lookupError } = await supabase
    .from("user_progress")
    .select("username, highest_level_id")
    .eq("username", trimmed)
    .maybeSingle();

  if (lookupError) {
    console.error("updateHighestLevel lookup error:", lookupError);
    return false;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("user_progress").insert({
      username: trimmed,
      highest_level_id: levelId,
    });

    if (insertError) {
      console.error("updateHighestLevel insert error:", insertError);
      return false;
    }

    return true;
  }

  if (levelId <= existing.highest_level_id) {
    return true;
  }

  const { error: updateError } = await supabase
    .from("user_progress")
    .update({
      highest_level_id: levelId,
      updated_at: new Date().toISOString(),
    })
    .eq("username", trimmed);

  if (updateError) {
    console.error("updateHighestLevel update error:", updateError);
    return false;
  }

  return true;
}

export async function syncSharedProgress(input: {
  username: string;
  highestLevelId: number;
  starsByLevel: Record<string, number>;
  totalStarsSpent: number;
}) {
  const trimmed = input.username.trim();

  if (!trimmed) return false;

  const existing = await getUserProgress(trimmed);
  const mergedStarsByLevel = mergeStarsByLevel(existing?.starsByLevel ?? {}, input.starsByLevel);
  const highestLevelId = Math.max(existing?.highestLevelId ?? 0, input.highestLevelId);
  const totalStarsEarned = sumStarsByLevel(mergedStarsByLevel);
  const totalStarsSpent = Math.max(existing?.totalStarsSpent ?? 0, input.totalStarsSpent);
  const payload = {
    username: trimmed,
    highest_level_id: highestLevelId,
    stars_by_level: mergedStarsByLevel,
    total_stars_earned: totalStarsEarned,
    total_stars_spent: totalStarsSpent,
    updated_at: new Date().toISOString(),
  };

  if (!existing) {
    const { error: insertError } = await supabase.from("user_progress").insert(payload);

    if (insertError) {
      console.error("syncSharedProgress insert error:", insertError);
      return false;
    }

    return true;
  }

  const { error: updateError } = await supabase
    .from("user_progress")
    .update(payload)
    .eq("username", trimmed);

  if (updateError) {
    console.error("syncSharedProgress update error:", updateError);
    return false;
  }

  return true;
}

export async function submitLevelScore(input: {
  levelId: number;
  username: string;
  mode: "transform" | "memory" | "symmetry" | "chromatic";
  size: number;
  moves: number;
  timeMs: number;
}) {
  const username = input.username.trim();

  if (!username) {
    console.error("submitLevelScore skipped: missing username");
    return false;
  }

  const { data: existing, error: existingError } = await supabase
    .from("level_scores")
    .select("id, time_ms, moves")
    .eq("level_id", input.levelId)
    .eq("username", username)
    .maybeSingle();

  if (existingError) {
    console.error("submitLevelScore existing lookup error:", existingError);
    return false;
  }

  const isBetterScore =
    !existing ||
    input.timeMs < existing.time_ms ||
    (input.timeMs === existing.time_ms && input.moves < existing.moves);

  if (!isBetterScore) {
    return true;
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("level_scores")
      .update({
        mode: input.mode,
        board_size: input.size,
        moves: input.moves,
        time_ms: input.timeMs,
        created_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("submitLevelScore update error:", updateError);
      return false;
    }

    return true;
  }

  const { error: insertError } = await supabase.from("level_scores").insert({
    level_id: input.levelId,
    username,
    mode: input.mode,
    board_size: input.size,
    moves: input.moves,
    time_ms: input.timeMs,
  });

  if (insertError) {
    console.error("submitLevelScore insert error:", insertError);
    return false;
  }

  return true;
}

export async function getDailyChallenge() {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_challenges")
    .select("challenge_date, level_id")
    .eq("challenge_date", today)
    .maybeSingle();

  if (error) {
    console.error("getDailyChallenge error:", error);
    return null;
  }

  return data;
}

function normalizeStarsByLevel(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "number" ? [[key, Math.max(0, Math.min(3, Math.floor(value)))]] : []
    )
  );
}

function mergeStarsByLevel(
  base: Record<string, number>,
  incoming: Record<string, number>
): Record<string, number> {
  const merged = { ...normalizeStarsByLevel(base) };

  for (const [levelId, stars] of Object.entries(normalizeStarsByLevel(incoming))) {
    merged[levelId] = Math.max(merged[levelId] ?? 0, stars);
  }

  return merged;
}

function sumStarsByLevel(starsByLevel: Record<string, number>) {
  return Object.values(normalizeStarsByLevel(starsByLevel)).reduce(
    (total, stars) => total + stars,
    0
  );
}
