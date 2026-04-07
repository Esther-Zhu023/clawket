import {
  classifyProPurchaseError,
  deriveProSubscriptionSnapshot,
  resetRevenueCatForTests,
  resolveRevenueCatConfig,
  selectDefaultRevenueCatPackage,
  selectRevenueCatPackages,
  selectSnapshotRevenueCatPackage,
  toProPaywallPackage,
} from './pro-subscription';
import { buildAnalyticsSubscriptionProperties } from './analytics/subscription-context';

describe('resolveRevenueCatConfig', () => {
  afterEach(() => {
    resetRevenueCatForTests();
  });

  it('returns null when billing config is missing', () => {
    const previousDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    expect(resolveRevenueCatConfig('ios', {} as NodeJS.ProcessEnv)).toBeNull();

    (globalThis as { __DEV__?: boolean }).__DEV__ = previousDev;
  });

  it('returns null when required config is missing for unsupported platforms', () => {
    expect(resolveRevenueCatConfig('web', {} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('prefers the test store api key in development', () => {
    const previousDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    expect(resolveRevenueCatConfig('ios', {
      EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: 'test_key',
      EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY: 'appl_key',
      EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID: 'pro',
    } as unknown as NodeJS.ProcessEnv)).toEqual({
      apiKey: 'test_key',
      entitlementId: 'pro',
      offeringId: undefined,
      packageId: undefined,
    });

    (globalThis as { __DEV__?: boolean }).__DEV__ = previousDev;
  });

  it('resolves iOS config from env', () => {
    const previousDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    expect(resolveRevenueCatConfig('ios', {
      EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY: 'appl_key',
      EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID: 'pro',
      EXPO_PUBLIC_REVENUECAT_PRO_OFFERING_ID: 'default',
      EXPO_PUBLIC_REVENUECAT_PRO_PACKAGE_ID: '$rc_monthly',
    } as unknown as NodeJS.ProcessEnv)).toEqual({
      apiKey: 'appl_key',
      entitlementId: 'pro',
      offeringId: 'default',
      packageId: '$rc_monthly',
    });

    (globalThis as { __DEV__?: boolean }).__DEV__ = previousDev;
  });

  it('resolves Android config from env', () => {
    const previousDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    expect(resolveRevenueCatConfig('android', {
      EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY: 'goog_key',
      EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID: 'pro',
    } as unknown as NodeJS.ProcessEnv)).toEqual({
      apiKey: 'goog_key',
      entitlementId: 'pro',
      offeringId: undefined,
      packageId: undefined,
    });

    (globalThis as { __DEV__?: boolean }).__DEV__ = previousDev;
  });
});

describe('deriveProSubscriptionSnapshot', () => {
  it('maps active entitlement state', () => {
    const snapshot = deriveProSubscriptionSnapshot({
      entitlements: {
        active: {
          pro: {
            identifier: 'pro',
            isActive: true,
            willRenew: true,
            periodType: 'NORMAL',
            latestPurchaseDate: '2026-03-08T00:00:00.000Z',
            latestPurchaseDateMillis: 1,
            originalPurchaseDate: '2026-03-01T00:00:00.000Z',
            originalPurchaseDateMillis: 1,
            expirationDate: '2026-04-08T00:00:00.000Z',
            expirationDateMillis: 1,
            store: 'APP_STORE',
            productIdentifier: 'clawket_pro_monthly',
            productPlanIdentifier: null,
            isSandbox: false,
            unsubscribeDetectedAt: null,
            unsubscribeDetectedAtMillis: null,
            billingIssueDetectedAt: null,
            billingIssueDetectedAtMillis: null,
            ownershipType: 'PURCHASED',
            verification: 'VERIFIED' as any,
          },
        },
        all: {},
        verification: 'VERIFIED' as any,
      },
      activeSubscriptions: ['clawket_pro_monthly'],
      allPurchasedProductIdentifiers: ['clawket_pro_monthly'],
      latestExpirationDate: '2026-04-08T00:00:00.000Z',
      firstSeen: '2026-03-01T00:00:00.000Z',
      originalAppUserId: '$RCAnonymousID:test',
      requestDate: '2026-03-08T00:00:00.000Z',
      allExpirationDates: {},
      allPurchaseDates: {},
      originalApplicationVersion: null,
      originalPurchaseDate: null,
      managementURL: 'https://apps.apple.com/account/subscriptions',
      nonSubscriptionTransactions: [],
      subscriptionsByProductIdentifier: {},
    }, 'pro');

    expect(snapshot).toEqual({
      isActive: true,
      entitlementId: 'pro',
      productIdentifier: 'clawket_pro_monthly',
      productPlanIdentifier: null,
      originalPurchaseDate: '2026-03-01T00:00:00.000Z',
      latestPurchaseDate: '2026-03-08T00:00:00.000Z',
      expirationDate: '2026-04-08T00:00:00.000Z',
      willRenew: true,
      store: 'APP_STORE',
      managementURL: 'https://apps.apple.com/account/subscriptions',
      originalAppUserId: '$RCAnonymousID:test',
      requestDate: '2026-03-08T00:00:00.000Z',
      verification: 'VERIFIED',
    });
  });
});

describe('buildAnalyticsSubscriptionProperties', () => {
  it('derives a coarse-grained analytics subscription context', () => {
    expect(buildAnalyticsSubscriptionProperties({
      isActive: true,
      entitlementId: 'pro',
      productIdentifier: 'clawket_pro_yearly',
      productPlanIdentifier: null,
      originalPurchaseDate: '2026-01-15T00:00:00.000Z',
      latestPurchaseDate: '2026-03-08T00:00:00.000Z',
      expirationDate: '2027-01-15T00:00:00.000Z',
      willRenew: true,
      store: 'APP_STORE',
      managementURL: null,
      originalAppUserId: '$RCAnonymousID:test',
      requestDate: null,
      verification: null,
    }, Date.parse('2026-03-23T00:00:00.000Z'))).toEqual({
      subscription_status: 'pro',
      subscription_type: 'yearly',
      subscription_tenure_bucket: '31_90d',
    });
  });

  it('falls back to non-sensitive defaults for free users', () => {
    expect(buildAnalyticsSubscriptionProperties(null)).toEqual({
      subscription_status: 'free',
      subscription_type: 'none',
      subscription_tenure_bucket: 'none',
    });
  });
});

describe('selectRevenueCatPackages', () => {
  const monthlyPackage = {
    identifier: '$rc_monthly',
    packageType: 'MONTHLY',
    product: {
      identifier: 'monthly',
      title: 'Clawket Pro Monthly',
      description: 'Unlock Pro',
      priceString: '$2.99',
      pricePerMonthString: '$2.99',
    },
  } as any;
  const annualPackage = {
    identifier: '$rc_annual',
    packageType: 'ANNUAL',
    product: {
      identifier: 'yearly',
      title: 'Clawket Pro Annual',
      description: 'Unlock Pro',
      priceString: '$29.99',
      pricePerMonthString: '$2.49',
    },
  } as any;
  const lifetimePackage = {
    identifier: '$rc_lifetime',
    packageType: 'LIFETIME',
    product: {
      identifier: 'lifetime',
      title: 'Clawket Pro Lifetime',
      description: 'Unlock Pro forever',
      priceString: '$79.99',
      pricePerMonthString: null,
    },
  } as any;

  it('returns monthly, annual, and lifetime packages in a stable order', () => {
    expect(selectRevenueCatPackages({
      all: {
        default: {
          identifier: 'default',
          availablePackages: [monthlyPackage, annualPackage, lifetimePackage],
          lifetime: lifetimePackage,
          monthly: monthlyPackage,
          annual: annualPackage,
        },
      },
      current: null,
    } as any, {
      apiKey: 'key',
      entitlementId: 'pro',
      offeringId: 'default',
    })).toEqual([monthlyPackage, annualPackage, lifetimePackage]);
  });

  it('falls back to the first available package when no monthly or annual package exists', () => {
    const customPackage = {
      identifier: 'promo',
      packageType: 'CUSTOM',
      product: {
        title: 'Promo',
        description: 'Unlock Pro',
        priceString: '$1.99',
        pricePerMonthString: null,
      },
    } as any;

    expect(selectRevenueCatPackages({
      all: {},
      current: {
        identifier: 'default',
        availablePackages: [customPackage],
        monthly: null,
        annual: null,
      },
    } as any, {
      apiKey: 'key',
      entitlementId: 'pro',
    })).toEqual([customPackage]);
  });

  it('prefers the configured package id as the default selected package', () => {
    const packages = [toProPaywallPackage(monthlyPackage), toProPaywallPackage(annualPackage)];
    expect(selectDefaultRevenueCatPackage(packages, {
      apiKey: 'key',
      entitlementId: 'pro',
      packageId: '$rc_annual',
    })?.packageIdentifier).toBe('$rc_annual');
  });

  it('defaults to the monthly package when no package id is configured', () => {
    const packages = [toProPaywallPackage(annualPackage), toProPaywallPackage(monthlyPackage)];
    expect(selectDefaultRevenueCatPackage(packages, {
      apiKey: 'key',
      entitlementId: 'pro',
    })?.packageIdentifier).toBe('$rc_monthly');
  });

  it('falls back to lifetime when it is the only primary paywall package', () => {
    const packages = [toProPaywallPackage(lifetimePackage)];
    expect(selectDefaultRevenueCatPackage(packages, {
      apiKey: 'key',
      entitlementId: 'pro',
    })?.packageIdentifier).toBe('$rc_lifetime');
  });

  it('matches the subscribed package from the snapshot product identifier', () => {
    const packages = [toProPaywallPackage(monthlyPackage), toProPaywallPackage(annualPackage)];
    expect(selectSnapshotRevenueCatPackage(packages, {
      isActive: true,
      entitlementId: 'pro',
      productIdentifier: 'yearly',
      productPlanIdentifier: null,
      originalPurchaseDate: null,
      latestPurchaseDate: null,
      expirationDate: null,
      willRenew: true,
      store: 'TEST_STORE',
      managementURL: null,
      originalAppUserId: '$RCAnonymousID:test',
      requestDate: null,
      verification: null,
    })?.packageIdentifier).toBe('$rc_annual');
  });

  it('matches a lifetime package from the snapshot product identifier', () => {
    const packages = [toProPaywallPackage(monthlyPackage), toProPaywallPackage(lifetimePackage)];
    expect(selectSnapshotRevenueCatPackage(packages, {
      isActive: true,
      entitlementId: 'pro',
      productIdentifier: 'com.p697.clawket.pro.lifetime',
      productPlanIdentifier: null,
      originalPurchaseDate: null,
      latestPurchaseDate: null,
      expirationDate: null,
      willRenew: false,
      store: 'APP_STORE',
      managementURL: null,
      originalAppUserId: '$RCAnonymousID:test',
      requestDate: null,
      verification: null,
    })?.packageIdentifier).toBe('$rc_lifetime');
  });
});

describe('classifyProPurchaseError', () => {
  it('maps RevenueCat error codes to UI states', () => {
    expect(classifyProPurchaseError({ code: '1' })).toBe('cancelled');
    expect(classifyProPurchaseError({ code: '20' })).toBe('pending');
    expect(classifyProPurchaseError({ code: '5' })).toBe('purchaseUnavailable');
    expect(classifyProPurchaseError({ code: '11' })).toBe('notConfigured');
    expect(classifyProPurchaseError(new Error('boom'))).toBe('unknown');
  });
});
