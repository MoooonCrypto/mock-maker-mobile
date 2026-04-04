import Constants from 'expo-constants';
import { Platform } from 'react-native';

type PurchasesExtra = {
  revenueCatAppleApiKey?: string;
  revenueCatGoogleApiKey?: string;
  revenueCatEntitlementId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as PurchasesExtra;

export const PRO_ENTITLEMENT_ID = extra.revenueCatEntitlementId ?? 'pro';
export const PRO_FALLBACK_PRICE_LABEL = '500円';

export function getRevenueCatApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return extra.revenueCatAppleApiKey ?? null;
  }
  if (Platform.OS === 'android') {
    return extra.revenueCatGoogleApiKey ?? null;
  }
  return null;
}

export function isRevenueCatConfigured(): boolean {
  return Boolean(getRevenueCatApiKey());
}
