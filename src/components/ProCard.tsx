import { View, Text, TouchableOpacity, ActivityIndicator, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { t } from '@/i18n';

const proFeatureIcons = [
  { icon: 'folder-open-outline', key: 'settings.proFeatureProjects' },
  { icon: 'ban-outline', key: 'settings.proFeatureNoAds' },
  { icon: 'phone-portrait-outline', key: 'settings.proFeatureLocal' },
] as const;

function FeatureRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View className="flex-row items-center mt-3">
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.13)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon as any} size={16} color="#ffffff" />
      </View>
      <Text className="flex-1 text-sm text-white ml-3" style={{ opacity: 0.9 }}>
        {label}
      </Text>
    </View>
  );
}

type ProCardProps = {
  isPro: boolean;
  priceLabel: string;
  primaryLabel?: string;
  restoreLabel?: string;
  onPrimaryPress?: () => void;
  onRestorePress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  showRestore?: boolean;
  style?: ViewStyle;
};

export function ProCard({
  isPro,
  priceLabel,
  primaryLabel,
  restoreLabel,
  onPrimaryPress,
  onRestorePress,
  loading = false,
  disabled = false,
  showRestore = true,
  style,
}: ProCardProps) {
  return (
    <View
      className="rounded-3xl p-5 overflow-hidden"
      style={[{ backgroundColor: isPro ? '#0f3f2f' : '#0f172a' }, style]}
    >
      <View
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: isPro ? 'rgba(34,197,94,0.22)' : 'rgba(43,140,238,0.25)',
          right: -60,
          top: -70,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: 'rgba(255,255,255,0.08)',
          left: -54,
          bottom: -70,
        }}
      />

      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <Text className="text-xs font-bold text-white">
              {isPro ? t('settings.proActiveBadge') : t('settings.proBadge')}
            </Text>
          </View>
          <Text className="text-2xl font-bold text-white mt-4">{t('settings.proTitle')}</Text>
          <Text className="text-sm text-white mt-2 leading-5" style={{ opacity: 0.82 }}>
            {t('settings.proBody')}
          </Text>
        </View>

        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isPro ? 'checkmark-circle-outline' : 'sparkles-outline'}
            size={28}
            color="#ffffff"
          />
        </View>
      </View>

      <View className="mt-4 rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Text className="text-xs font-semibold text-white" style={{ opacity: 0.72 }}>
          {t('settings.proOneTimeLabel')}
        </Text>
        <Text className="text-xl font-bold text-white mt-1">
          {t('settings.proPrice', { price: priceLabel })}
        </Text>
      </View>

      <View className="mt-2">
        {proFeatureIcons.map(({ icon, key }) => (
          <FeatureRow key={key} icon={icon} label={t(key)} />
        ))}
      </View>

      {isPro ? (
        <View className="mt-5 rounded-2xl px-4 py-4" style={{ backgroundColor: 'rgba(220,252,231,0.18)' }}>
          <Text className="text-base font-bold text-white">{t('settings.proActiveTitle')}</Text>
          <Text className="text-sm text-white mt-1" style={{ opacity: 0.82 }}>
            {t('settings.proActiveBody')}
          </Text>
        </View>
      ) : (
        (primaryLabel || showRestore) && (
          <View className="mt-5">
            {primaryLabel && onPrimaryPress && (
              <TouchableOpacity
                onPress={onPrimaryPress}
                disabled={disabled || loading}
                className="rounded-2xl items-center justify-center py-4"
                style={{
                  backgroundColor: disabled || loading ? 'rgba(255,255,255,0.22)' : '#ffffff',
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text className="font-bold" style={{ color: colors.primary }}>
                    {primaryLabel}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {showRestore && restoreLabel && onRestorePress && (
              <TouchableOpacity
                onPress={onRestorePress}
                disabled={disabled || loading}
                className="mt-3 rounded-2xl border items-center justify-center py-3 flex-row"
                style={{
                  borderColor: 'rgba(255,255,255,0.26)',
                  opacity: disabled || loading ? 0.5 : 1,
                }}
              >
                <Ionicons name="refresh-outline" size={17} color="#ffffff" />
                <Text className="text-sm font-semibold text-white ml-2">{restoreLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        )
      )}
    </View>
  );
}
