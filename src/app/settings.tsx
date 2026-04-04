import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { colors } from '@/constants/theme';
import { PRO_FALLBACK_PRICE_LABEL } from '@/config/purchases';
import { t } from '@/i18n';

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
    currentPackage,
    purchasePro,
    restorePurchases,
  } = usePurchaseStore();

  const priceLabel = currentPackage?.product.priceString ?? PRO_FALLBACK_PRICE_LABEL;
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

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="w-10" />
        <Text className="text-lg font-bold text-gray-900">{t('settings.title')}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View className="mx-5 mt-6 bg-white rounded-xl p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-sm font-semibold text-amber-600 mb-2">{t('settings.proBadge')}</Text>
            <Text className="text-xl font-bold text-gray-900">{t('settings.proTitle')}</Text>
            <Text className="text-sm text-gray-500 mt-2">{t('settings.proBody')}</Text>
            <Text className="text-base font-semibold text-gray-900 mt-4">
              {t('settings.proPrice', { price: priceLabel })}
            </Text>
          </View>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: isPro ? '#dcfce7' : '#fef3c7',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={isPro ? 'shield-checkmark-outline' : 'diamond-outline'}
              size={24}
              color={isPro ? colors.success : '#d97706'}
            />
          </View>
        </View>

        <View className="mt-4">
          <Text className="text-sm text-gray-700">{t('settings.proFeatureNoAds')}</Text>
          <Text className="text-sm text-gray-700 mt-1">{t('settings.proFeatureProjects')}</Text>
          <Text className="text-xs text-gray-400 mt-3">{t('settings.proLocalOnly')}</Text>
        </View>

        {!isConfigured && (
          <View className="mt-4 rounded-xl bg-red-50 px-3 py-3">
            <Text className="text-sm text-red-700">{t('settings.proUnavailableBody')}</Text>
          </View>
        )}

        <View className="mt-5 flex-row gap-3">
          {isPro ? (
            <View className="flex-1 rounded-xl bg-green-50 px-4 py-4">
              <Text className="text-base font-semibold text-green-700">{t('settings.proActiveTitle')}</Text>
              <Text className="text-sm text-green-700 mt-1">{t('settings.proActiveBody')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={!isConfigured || purchaseBusy}
              className="flex-1 rounded-xl items-center justify-center py-4"
              style={{
                backgroundColor: !isConfigured || purchaseBusy ? '#93c5fd' : colors.primary,
              }}
            >
              {purchaseBusy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold">{t('settings.proBuyButton')}</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleRestore}
            disabled={!isConfigured || purchaseBusy}
            className="rounded-xl border border-gray-200 items-center justify-center px-4 py-4"
            style={{ minWidth: 112, opacity: !isConfigured || purchaseBusy ? 0.5 : 1 }}
          >
            <Text className="text-sm font-semibold text-gray-700">{t('settings.proRestoreButton')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/projects')}
          disabled={!isPro}
          className="mt-4 rounded-xl border border-gray-200 px-4 py-4 flex-row items-center justify-between"
          style={{ opacity: isPro ? 1 : 0.45 }}
        >
          <View>
            <Text className="text-base font-semibold text-gray-900">{t('settings.projectLibraryTitle')}</Text>
            <Text className="text-sm text-gray-500 mt-1">{t('settings.projectLibraryBody')}</Text>
          </View>
          <Ionicons name="folder-open-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View className="mx-5 mt-4 bg-white rounded-xl p-4">
        <Text className="text-sm font-semibold text-gray-500 mb-3">
          {t('settings.exportSectionTitle')}
        </Text>

        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base text-gray-900">{t('settings.exportFormat')}</Text>
          <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
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
          <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
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
      </View>

      <View className="mx-5 mt-4 bg-white rounded-xl p-4">
        <Text className="text-sm font-semibold text-gray-500 mb-2">{t('settings.appInfoTitle')}</Text>
        <Text className="text-base text-gray-900">MockMaker v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}
