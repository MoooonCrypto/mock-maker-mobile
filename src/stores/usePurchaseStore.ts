import { create } from 'zustand';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import {
  getRevenueCatApiKey,
  isRevenueCatConfigured,
  PRO_ENTITLEMENT_ID,
} from '@/config/purchases';

interface PurchaseActionResult {
  ok: boolean;
  cancelled?: boolean;
  message?: string;
}

interface PurchaseState {
  isConfigured: boolean;
  isReady: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  isPro: boolean;
  currentOffering: PurchasesOffering | null;
  currentPackage: PurchasesPackage | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  purchasePro: () => Promise<PurchaseActionResult>;
  restorePurchases: () => Promise<PurchaseActionResult>;
}

let purchasesConfigured = false;
let customerInfoListenerAttached = false;

function isEntitlementActive(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
}

function pickPackage(offering: PurchasesOffering | null): PurchasesPackage | null {
  if (!offering) return null;
  return offering.lifetime ?? offering.availablePackages[0] ?? null;
}

function parseError(error: unknown): PurchaseActionResult {
  if (
    typeof error === 'object' &&
    error !== null &&
    'userCancelled' in error &&
    error.userCancelled
  ) {
    return { ok: false, cancelled: true };
  }

  if (error instanceof Error) {
    return { ok: false, message: error.message };
  }

  return { ok: false, message: 'Unknown purchase error' };
}

async function syncCustomerState() {
  const [customerInfo, offerings] = await Promise.all([
    Purchases.getCustomerInfo(),
    Purchases.getOfferings(),
  ]);

  const currentOffering = offerings.current ?? Object.values(offerings.all)[0] ?? null;
  const currentPackage = pickPackage(currentOffering);

  usePurchaseStore.setState({
    isPro: isEntitlementActive(customerInfo),
    currentOffering,
    currentPackage,
  });
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  isConfigured: isRevenueCatConfigured(),
  isReady: false,
  isLoading: false,
  isPurchasing: false,
  isRestoring: false,
  isPro: false,
  currentOffering: null,
  currentPackage: null,

  initialize: async () => {
    if (get().isReady || get().isLoading) return;

    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      set({ isConfigured: false, isReady: true });
      return;
    }

    set({ isLoading: true, isConfigured: true });

    try {
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      if (!purchasesConfigured) {
        Purchases.configure({ apiKey });
        purchasesConfigured = true;
      }

      if (!customerInfoListenerAttached) {
        Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          usePurchaseStore.setState({
            isPro: isEntitlementActive(customerInfo),
          });
        });
        customerInfoListenerAttached = true;
      }

      await syncCustomerState();
    } catch {
      set({
        currentOffering: null,
        currentPackage: null,
        isPro: false,
      });
    } finally {
      set({ isLoading: false, isReady: true });
    }
  },

  refresh: async () => {
    if (!get().isConfigured) return;
    try {
      await syncCustomerState();
    } catch {
      // keep last known purchase state
    }
  },

  purchasePro: async () => {
    if (!get().isConfigured) {
      return { ok: false, message: 'RevenueCat keys are not configured.' };
    }

    if (!get().isReady) {
      await get().initialize();
    }

    const selectedPackage = get().currentPackage;
    if (!selectedPackage) {
      return { ok: false, message: 'No purchasable package is available.' };
    }

    set({ isPurchasing: true });
    try {
      const result = await Purchases.purchasePackage(selectedPackage);
      const purchaseActivatedPro = isEntitlementActive(result.customerInfo);
      set({ isPro: purchaseActivatedPro });
      await get().refresh();

      if (purchaseActivatedPro || get().isPro) {
        return { ok: true };
      }

      return {
        ok: false,
        message: 'Purchase completed, but the Pro entitlement was not activated. Please try restoring purchases.',
      };
    } catch (error) {
      return parseError(error);
    } finally {
      set({ isPurchasing: false });
    }
  },

  restorePurchases: async () => {
    if (!get().isConfigured) {
      return { ok: false, message: 'RevenueCat keys are not configured.' };
    }

    if (!get().isReady) {
      await get().initialize();
    }

    set({ isRestoring: true });
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = isEntitlementActive(customerInfo);
      set({ isPro });
      await get().refresh();
      return isPro
        ? { ok: true }
        : { ok: false, message: 'No active Pro entitlement was found to restore.' };
    } catch (error) {
      return parseError(error);
    } finally {
      set({ isRestoring: false });
    }
  },
}));
