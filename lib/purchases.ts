"use client";

import { Capacitor } from "@capacitor/core";
import {
  LOG_LEVEL,
  PRODUCT_CATEGORY,
  Purchases,
  type PurchasesStoreProduct,
} from "@revenuecat/purchases-capacitor";

export const STORE_PRODUCT_IDS = ["fuel_5", "fuel_15", "stars_20"] as const;

export type StoreProductId = (typeof STORE_PRODUCT_IDS)[number];

export type StoreCatalogItem = {
  productId: StoreProductId;
  title: string;
  subtitle: string;
  fuelAmount?: number;
  starAmount?: number;
};

export const STORE_CATALOG: StoreCatalogItem[] = [
  {
    productId: "fuel_5",
    title: "5 Fuel",
    subtitle: "Restore 5 fuel instantly",
    fuelAmount: 5,
  },
  {
    productId: "fuel_15",
    title: "15 Fuel",
    subtitle: "Restore 15 fuel instantly",
    fuelAmount: 15,
  },
  {
    productId: "stars_20",
    title: "20 Stars",
    subtitle: "Get 20 stars for hints and boosts",
    starAmount: 20,
  },
];

export type LoadedStoreProducts = Partial<Record<StoreProductId, PurchasesStoreProduct>>;

let purchasesConfigured = false;
let configuredApiKey: string | null = null;
let configuredAccountId: string | null = null;

export function isNativePurchasePlatform() {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

export async function loadStoreProducts(accountId: string): Promise<LoadedStoreProducts> {
  await ensurePurchasesConfigured(accountId);

  const { products } = await Purchases.getProducts({
    productIdentifiers: [...STORE_PRODUCT_IDS],
    type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  });

  return products.reduce<LoadedStoreProducts>((mappedProducts, product) => {
    if (isStoreProductId(product.identifier)) {
      mappedProducts[product.identifier] = product;
    }

    return mappedProducts;
  }, {});
}

export async function purchaseStoreItem(
  accountId: string,
  productId: StoreProductId,
  products: LoadedStoreProducts
) {
  await ensurePurchasesConfigured(accountId);

  const product = products[productId];

  if (!product) {
    throw new Error("That pack is not available yet. Try reopening the store in a moment.");
  }

  await Purchases.purchaseStoreProduct({ product });
  return getStoreReward(productId);
}

function getStoreReward(productId: StoreProductId) {
  switch (productId) {
    case "fuel_5":
      return { fuel: 5, stars: 0 };
    case "fuel_15":
      return { fuel: 15, stars: 0 };
    case "stars_20":
      return { fuel: 0, stars: 20 };
    default:
      return { fuel: 0, stars: 0 };
  }
}

async function ensurePurchasesConfigured(accountId: string) {
  if (!isNativePurchasePlatform()) {
    throw new Error("Purchases are available on the installed iPhone and Android apps only.");
  }

  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    throw new Error(
      "The store is not configured yet. Add your RevenueCat public SDK key before testing purchases."
    );
  }

  if (!purchasesConfigured || configuredApiKey !== apiKey) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({
      apiKey,
      appUserID: accountId,
    });
    purchasesConfigured = true;
    configuredApiKey = apiKey;
    configuredAccountId = accountId;
    return;
  }

  if (configuredAccountId !== accountId) {
    await Purchases.logIn({ appUserID: accountId });
    configuredAccountId = accountId;
  }
}

function getRevenueCatApiKey() {
  const platform = Capacitor.getPlatform();

  if (platform === "ios") {
    return process.env.NEXT_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim() ?? "";
  }

  if (platform === "android") {
    return process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim() ?? "";
  }

  return "";
}

function isStoreProductId(value: string): value is StoreProductId {
  return STORE_PRODUCT_IDS.includes(value as StoreProductId);
}
