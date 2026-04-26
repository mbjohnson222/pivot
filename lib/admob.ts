"use client";

import { Capacitor } from "@capacitor/core";
import { AdMob, AdmobConsentStatus } from "@capacitor-community/admob";

const REWARDED_AD_IDS = {
  android: "ca-app-pub-9279205525509269/2241855841",
  ios: "ca-app-pub-9279205525509269/6006053063",
} as const;

// Keep rewarded ads in test mode until the app is ready for production release.
const FORCE_TEST_ADS = true;

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
    initializePromise = (async () => {
      await AdMob.initialize();

      try {
        const [trackingInfo, consentInfo] = await Promise.all([
          AdMob.trackingAuthorizationStatus(),
          AdMob.requestConsentInfo(),
        ]);

        if (trackingInfo.status === "notDetermined") {
          await AdMob.requestTrackingAuthorization();
        }

        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdmobConsentStatus.REQUIRED &&
          !consentInfo.canRequestAds
        ) {
          await AdMob.showConsentForm();
        }
      } catch (error) {
        console.warn("AdMob consent/tracking setup warning:", error);
      }
    })();
  }

  await initializePromise;
}

export async function showRewardedFuelAd() {
  if (!isNativeAdPlatform()) {
    throw new Error("Rewarded ads are only available on iPhone and Android devices.");
  }

  await initializeAdMob();

  try {
    await AdMob.prepareRewardVideoAd({
      adId: getRewardedAdUnitId(),
      isTesting: FORCE_TEST_ADS || process.env.NODE_ENV !== "production",
      immersiveMode: true,
    });

    const reward = await AdMob.showRewardVideoAd();
    return reward.amount > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rewarded ad failed to load.";
    throw new Error(message);
  }
}
