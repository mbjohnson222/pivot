"use client";

import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";

const REWARDED_AD_IDS = {
  android: "ca-app-pub-9279205525509269/2241855841",
  ios: "ca-app-pub-9279205525509269/6006053063",
} as const;

let initializePromise: Promise<void> | null = null;

function isNativeAdPlatform() {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

function getRewardedAdUnitId() {
  return Capacitor.getPlatform() === "ios"
    ? REWARDED_AD_IDS.ios
    : REWARDED_AD_IDS.android;
}

export async function initializeAdMob() {
  if (!isNativeAdPlatform()) return;

  if (!initializePromise) {
    initializePromise = AdMob.initialize();
  }

  await initializePromise;
}

export async function showRewardedFuelAd() {
  if (!isNativeAdPlatform()) {
    return false;
  }

  await initializeAdMob();

  await AdMob.prepareRewardVideoAd({
    adId: getRewardedAdUnitId(),
    isTesting: process.env.NODE_ENV !== "production",
    immersiveMode: true,
  });

  const reward = await AdMob.showRewardVideoAd();
  return reward.amount > 0;
}
