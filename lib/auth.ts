"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type AuthIdentity = {
  accountId: string;
  email: string | null;
  username: string;
};

type ProfileRow = {
  id: string;
  username: string;
  email: string | null;
};

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  username: string;
}) {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();

  const existingProfile = await getProfileByUsername(username);
  if (existingProfile) {
    throw new Error("That username is already taken.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username,
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    requiresEmailConfirmation: !data.session,
  };
}

export async function signInWithEmail(input: { email: string; password: string }) {
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  if (error) {
    throw error;
  }
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getCurrentIdentity(): Promise<AuthIdentity | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return null;
  }

  return ensureIdentityForUser(session.user);
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

async function ensureIdentityForUser(user: User): Promise<AuthIdentity | null> {
  const profile = await getProfileByUserId(user.id);
  const metadataUsername = readUsernameFromUser(user);
  const fallbackUsername = metadataUsername || fallbackUsernameFromEmail(user.email);
  const nextUsername = profile?.username || fallbackUsername;

  if (!nextUsername) {
    return null;
  }

  if (!profile) {
    const upserted = await upsertProfile({
      id: user.id,
      email: user.email ?? null,
      username: nextUsername,
    });

    if (!upserted) {
      return null;
    }
  }

  return {
    accountId: user.id,
    email: user.email ?? null,
    username: nextUsername,
  };
}

async function getProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("getProfileByUserId error:", error);
    return null;
  }

  return data;
}

async function getProfileByUsername(username: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("getProfileByUsername error:", error);
    return null;
  }

  return data;
}

async function upsertProfile(profile: ProfileRow) {
  const { error } = await supabase.from("profiles").upsert(profile);

  if (error) {
    console.error("upsertProfile error:", error);
    return false;
  }

  return true;
}

function readUsernameFromUser(user: User) {
  const username = user.user_metadata?.username;
  return typeof username === "string" ? username.trim() : "";
}

function fallbackUsernameFromEmail(email?: string | null) {
  if (!email) return "";

  const [localPart] = email.split("@");
  return localPart?.trim() ?? "";
}
