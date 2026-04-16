import { View, Text, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { colors } from '@/constants/theme';
import { PRO_FALLBACK_PRICE_LABEL } from '@/config/purchases';
import { t } from '@/i18n';
import { ProCard } from '@/components/ProCard';

const PRIVACY_POLICY_URL = 'https://mooooncrypto.github.io/mockmaker-privacy/';
const SUPPORT_EMAIL = 'mokotech7@gmail.com';

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View className="mx-5 mt-4 bg-white rounded-2xl p-4">{children}</View>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { defaultExport, setDefaultExport } = useSettingsStore();
  const {
    isConfigured,
    isReady,
    isLoading,
    isPurchasing,
    isRestoring,
    isPro,
    purchasePro,
    restorePurchases,
  } = usePurchaseStore();

  const purchaseBusy = isLoading || isPurchasing || isRestoring || !isReady;

  const handlePurchase = async () => {
    const result = await purchasePro();
    if (result.ok) {
      Alert.alert(t('settings.proPurchaseSuccessTitle'), t('settings.proPurchaseSuccessBody'));
      return;
    }
    if (result.cancelled) return;
    Alert.alert(t('settings.proPurchaseErrorTitle'), result.message ?? t('settings.proUnavailableBody'));
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    if (result.ok) {
      Alert.alert(t('settings.proRestoreSuccessTitle'), t('settings.proRestoreSuccessBody'));
      return;
    }
    if (result.cancelled) return;
    Alert.alert(t('settings.proRestoreErrorTitle'), result.message ?? t('settings.proRestoreErrorBody'));
  };

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(t('settings.linkOpenErrorTitle'), PRIVACY_POLICY_URL);
    }
  };

  const openSupportEmail = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=MockMaker%20Support`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // Fall through to showing the address.
    }
    Alert.alert(t('settings.supportEmailTitle'), SUPPORT_EMAIL);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="w-10" />
        <Text className="text-lg font-bold text-gray-900">{t('settings.title')}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View className="mx-5 mt-6">
          <ProCard
            isPro={isPro}
            priceLabel={PRO_FALLBACK_PRICE_LABEL}
            primaryLabel={t('settings.proBuyButton')}
            restoreLabel={t('settings.proRestoreButton')}
            onPrimaryPress={handlePurchase}
            onRestorePress={handleRestore}
            loading={purchaseBusy}
            disabled={!isConfigured}
          />
          {!isConfigured && (
            <View className="mt-3 rounded-xl bg-red-50 px-3 py-3">
              <Text className="text-sm text-red-700">{t('settings.proUnavailableBody')}</Text>
            </View>
          )}
        </View>

        <SectionCard>
          <Text className="text-sm font-semibold text-gray-500 mb-3">{t('settings.projectSectionTitle')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/projects')}
            disabled={!isPro}
            className="rounded-2xl border border-gray-200 px-4 py-4 flex-row items-center justify-between"
            style={{ opacity: isPro ? 1 : 0.55 }}
          >
            <View className="flex-row items-center flex-1">
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: isPro ? '#eff6ff' : '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={isPro ? 'folder-open-outline' : 'folder-outline'}
                  size={20}
                  color={isPro ? colors.primary : '#d97706'}
                />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-semibold text-gray-900">{t('settings.projectLibraryTitle')}</Text>
                <Text className="text-sm text-gray-500 mt-1">{t('settings.projectLibraryBody')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text className="text-xs text-gray-400 mt-3 leading-4">{t('settings.proLocalOnly')}</Text>
        </SectionCard>

        <SectionCard>
          <Text className="text-sm font-semibold text-gray-500 mb-3">
            {t('settings.exportSectionTitle')}
          </Text>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base text-gray-900">{t('settings.exportFormat')}</Text>
            <View className="flex-row bg-gray-100 rounded-xl overflow-hidden">
              {(['png', 'jpg'] as const).map((fmt) => (
                <TouchableOpacity
                  key={fmt}
                  onPress={() => setDefaultExport({ format: fmt })}
                  className={`px-4 py-2 ${
                    defaultExport.format === fmt ? 'bg-primary' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      defaultExport.format === fmt ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-base text-gray-900">{t('settings.exportQuality')}</Text>
            <View className="flex-row bg-gray-100 rounded-xl overflow-hidden">
              {([
                { key: 'standard' as const, label: t('settings.exportQualityStandard') },
                { key: 'high' as const, label: t('settings.exportQualityHigh') },
              ]).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setDefaultExport({ quality: key })}
                  className={`px-4 py-2 ${
                    defaultExport.quality === key ? 'bg-primary' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      defaultExport.quality === key ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SectionCard>

        <SectionCard>
          <Text className="text-sm font-semibold text-gray-500 mb-2">{t('settings.appInfoTitle')}</Text>
          <Text className="text-base font-semibold text-gray-900">MockMaker v1.0.0</Text>
          <Text className="text-xs text-gray-400 mt-2 leading-4">{t('settings.reviewSafeNote')}</Text>
        </SectionCard>

        <SectionCard>
          <Text className="text-sm font-semibold text-gray-500 mb-3">{t('settings.supportSectionTitle')}</Text>
          <TouchableOpacity
            onPress={openPrivacyPolicy}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="shield-checkmark-outline" size={21} color={colors.textSecondary} />
              <Text className="text-base text-gray-900 ml-3">{t('settings.privacyPolicy')}</Text>
            </View>
            <Ionicons name="open-outline" size={19} color={colors.textSecondary} />
          </TouchableOpacity>
          <View className="h-px bg-gray-100" />
          <TouchableOpacity
            onPress={openSupportEmail}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="mail-outline" size={21} color={colors.textSecondary} />
              <View className="flex-1 ml-3">
                <Text className="text-base text-gray-900">{t('settings.contactSupport')}</Text>
                <Text className="text-xs text-gray-400 mt-1">{SUPPORT_EMAIL}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
          </TouchableOpacity>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
