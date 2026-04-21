"use client";

import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";

const TEST_REWARDED_AD_IDS = {
  android: "ca-app-pub-3940256099942544/5224354917",
  ios: "ca-app-pub-3940256099942544/1712485313",
} as const;

let initializePromise: Promise<void> | null = null;

function isNativeAdPlatform() {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

function getRewardedAdUnitId() {
  return Capacitor.getPlatform() === "ios"
    ? TEST_REWARDED_AD_IDS.ios
    : TEST_REWARDED_AD_IDS.android;
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
    isTesting: true,
    immersiveMode: true,
  });

  const reward = await AdMob.showRewardVideoAd();
  return reward.amount > 0;
}
