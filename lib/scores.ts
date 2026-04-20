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
