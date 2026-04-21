"use client";

import { Preferences } from "@capacitor/preferences";

export async function getStoredString(key: string) {
  try {
    const { value } = await Preferences.get({ key });
    return value;
  } catch {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem(key);
  }
}

export async function setStoredString(key: string, value: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, value);
  }

  try {
    await Preferences.set({ key, value });
  } catch {}
}

export async function getStoredJson<T>(key: string): Promise<T | null> {
  const raw = await getStoredString(key);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setStoredJson<T>(key: string, value: T) {
  const raw = JSON.stringify(value);
  await setStoredString(key, raw);
}
