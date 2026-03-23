import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import { publicRevenueCatConfig, resolvePublicRevenueCatConfig } from '../config/public';

export type RevenueCatConfig = {
  apiKey: string;
  entitlementId: string;
  offeringId?: string;
  packageId?: string;
};

export type ProSubscriptionSnapshot = {
  isActive: boolean;
  entitlementId: string;
  productIdentifier: string | null;
  productPlanIdentifier: string | null;
  originalPurchaseDate: string | null;
  latestPurchaseDate: string | null;
  expirationDate: string | null;
  willRenew: boolean;
  store: string | null;
  managementURL: string | null;
  originalAppUserId: string | null;
  requestDate: string | null;
  verification: string | null;
};

export type ProPaywallPackage = {
  offeringIdentifier: string;
  packageIdentifier: string;
  packageType: string;
  productIdentifier: string | null;
  title: string;
  description: string;
  priceString: string;
  pricePerMonthString: string | null;
  package: PurchasesPackage;
};

export type ProPurchaseResult = {
  customerInfo: CustomerInfo;
  snapshot: ProSubscriptionSnapshot;
};

export type ProPurchaseErrorCode =
  | 'cancelled'
  | 'pending'
  | 'purchaseUnavailable'
  | 'notConfigured'
  | 'unknown';

let configurePromise: Promise<RevenueCatConfig | null> | null = null;

function isDevRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
}

function trimEnv(value: string | undefined | null): string {
  return value?.trim() ?? '';
}

export function resolveRevenueCatConfig(
  platformOS: string = Platform.OS,
  env: NodeJS.ProcessEnv = process.env,
): RevenueCatConfig | null {
  const config = env === process.env ? publicRevenueCatConfig : resolvePublicRevenueCatConfig(env);
  if (!config.enabled) return null;
  const testApiKey = trimEnv(config.testApiKey);
  const platformApiKey = platformOS === 'ios'
    ? trimEnv(config.iosApiKey)
    : platformOS === 'android'
      ? trimEnv(config.androidApiKey)
      : '';
  const apiKey = isDevRuntime() && testApiKey ? testApiKey : platformApiKey;
  const entitlementId = trimEnv(config.entitlementId);
  const offeringId = trimEnv(config.offeringId);
  const packageId = trimEnv(config.packageId);

  if (!apiKey || !entitlementId) return null;

  return {
    apiKey,
    entitlementId,
    offeringId: offeringId || undefined,
    packageId: packageId || undefined,
  };
}

export async function ensureRevenueCatConfigured(): Promise<RevenueCatConfig | null> {
  const config = resolveRevenueCatConfig();
  if (!config) return null;

  if (!configurePromise) {
    configurePromise = (async () => {
      const isConfigured = await Purchases.isConfigured().catch(() => false);
      if (!isConfigured) {
        Purchases.configure({
          apiKey: config.apiKey,
          entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
          storeKitVersion: Purchases.STOREKIT_VERSION.DEFAULT,
        });
      }
      await Purchases.setLogLevel(isDevRuntime() ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.WARN);
      return config;
    })().catch((error) => {
      configurePromise = null;
      throw error;
    });
  }

  return configurePromise;
}

export function deriveProSubscriptionSnapshot(
  customerInfo: CustomerInfo,
  entitlementId: string,
): ProSubscriptionSnapshot {
  const entitlement = customerInfo.entitlements.all[entitlementId]
    ?? customerInfo.entitlements.active[entitlementId]
    ?? null;

  return {
    isActive: Boolean(customerInfo.entitlements.active[entitlementId]?.isActive),
    entitlementId,
    productIdentifier: entitlement?.productIdentifier ?? null,
    productPlanIdentifier: entitlement?.productPlanIdentifier ?? null,
    originalPurchaseDate: entitlement?.originalPurchaseDate ?? customerInfo.originalPurchaseDate ?? null,
    latestPurchaseDate: entitlement?.latestPurchaseDate ?? null,
    expirationDate: entitlement?.expirationDate ?? null,
    willRenew: entitlement?.willRenew ?? false,
    store: entitlement?.store ?? null,
    managementURL: customerInfo.managementURL ?? null,
    originalAppUserId: customerInfo.originalAppUserId ?? null,
    requestDate: customerInfo.requestDate ?? null,
    verification: entitlement?.verification ?? customerInfo.entitlements.verification ?? null,
  };
}

export function selectRevenueCatOffering(
  offerings: PurchasesOfferings,
  config: RevenueCatConfig,
): PurchasesOffering | null {
  if (config.offeringId) {
    return offerings.all[config.offeringId] ?? null;
  }
  return offerings.current;
}

export function selectRevenueCatPackages(
  offerings: PurchasesOfferings,
  config: RevenueCatConfig,
): PurchasesPackage[] {
  const offering = selectRevenueCatOffering(offerings, config);
  if (!offering) return [];

  const prioritized = [
    config.packageId ? offering.availablePackages.find((item) => item.identifier === config.packageId) ?? null : null,
    offering.monthly,
    offering.annual,
    ...offering.availablePackages,
  ].filter((item): item is PurchasesPackage => Boolean(item));

  const unique = prioritized.filter((item, index, array) => (
    array.findIndex((candidate) => candidate.identifier === item.identifier) === index
  ));

  const subscriptionPackages = unique.filter((item) => (
    item.packageType === PACKAGE_TYPE.MONTHLY || item.packageType === PACKAGE_TYPE.ANNUAL
  ));

  if (subscriptionPackages.length > 0) {
    return subscriptionPackages;
  }

  return unique.slice(0, 1);
}

export function selectDefaultRevenueCatPackage(
  packages: ProPaywallPackage[],
  config: RevenueCatConfig,
): ProPaywallPackage | null {
  if (packages.length === 0) return null;
  if (config.packageId) {
    return packages.find((item) => item.packageIdentifier === config.packageId) ?? packages[0];
  }
  return packages.find((item) => item.packageType === PACKAGE_TYPE.MONTHLY) ?? packages[0];
}

export function selectSnapshotRevenueCatPackage(
  packages: ProPaywallPackage[],
  snapshot: ProSubscriptionSnapshot | null,
): ProPaywallPackage | null {
  if (!snapshot?.productIdentifier) return null;

  const directMatch = packages.find((item) => item.productIdentifier === snapshot.productIdentifier) ?? null;
  if (directMatch) return directMatch;

  const normalized = snapshot.productIdentifier.toLowerCase();
  if (
    normalized.includes('year')
    || normalized.includes('annual')
    || normalized.includes('annually')
  ) {
    return packages.find((item) => item.packageType === PACKAGE_TYPE.ANNUAL) ?? null;
  }
  if (normalized.includes('month')) {
    return packages.find((item) => item.packageType === PACKAGE_TYPE.MONTHLY) ?? null;
  }
  return null;
}

export function toProPaywallPackage(aPackage: PurchasesPackage): ProPaywallPackage {
  return {
    offeringIdentifier: aPackage.presentedOfferingContext?.offeringIdentifier ?? aPackage.offeringIdentifier,
    packageIdentifier: aPackage.identifier,
    packageType: aPackage.packageType,
    productIdentifier: aPackage.product.identifier ?? null,
    title: aPackage.product.title,
    description: aPackage.product.description,
    priceString: aPackage.product.priceString,
    pricePerMonthString: aPackage.product.pricePerMonthString,
    package: aPackage,
  };
}

export function classifyProPurchaseError(error: unknown): ProPurchaseErrorCode {
  const code = (error as PurchasesError | undefined)?.code;
  if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
  if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
  if (
    code === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR
    || code === PURCHASES_ERROR_CODE.CONFIGURATION_ERROR
  ) {
    return 'purchaseUnavailable';
  }
  if (code === PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR) return 'notConfigured';
  return 'unknown';
}

export const ProSubscriptionService = {
  async getCustomerInfo(): Promise<ProPurchaseResult | null> {
    const config = await ensureRevenueCatConfigured();
    if (!config) return null;
    const customerInfo = await Purchases.getCustomerInfo();
    return {
      customerInfo,
      snapshot: deriveProSubscriptionSnapshot(customerInfo, config.entitlementId),
    };
  },

  async getPaywallPackages(): Promise<ProPaywallPackage[]> {
    const config = await ensureRevenueCatConfigured();
    if (!config) return [];
    const offerings = await Purchases.getOfferings();
    return selectRevenueCatPackages(offerings, config).map(toProPaywallPackage);
  },

  async purchasePro(aPackage: PurchasesPackage): Promise<ProPurchaseResult> {
    const config = await ensureRevenueCatConfigured();
    if (!config) {
      throw new Error('RevenueCat is not configured.');
    }
    const result = await Purchases.purchasePackage(aPackage);
    return {
      customerInfo: result.customerInfo,
      snapshot: deriveProSubscriptionSnapshot(result.customerInfo, config.entitlementId),
    };
  },

  async restorePurchases(): Promise<ProPurchaseResult | null> {
    const config = await ensureRevenueCatConfigured();
    if (!config) return null;
    const customerInfo = await Purchases.restorePurchases();
    return {
      customerInfo,
      snapshot: deriveProSubscriptionSnapshot(customerInfo, config.entitlementId),
    };
  },
};

export function resetRevenueCatForTests(): void {
  configurePromise = null;
}
