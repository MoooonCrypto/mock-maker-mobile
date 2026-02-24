import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { colors } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { defaultExport, setDefaultExport } = useSettingsStore();

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="w-10" />
        <Text className="text-lg font-bold text-gray-900">設定</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View className="mx-5 mt-6 bg-white rounded-xl p-4">
        <Text className="text-sm font-semibold text-gray-500 mb-3">
          デフォルト書き出し設定
        </Text>

        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base text-gray-900">フォーマット</Text>
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
          <Text className="text-base text-gray-900">画質</Text>
          <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
            {([
              { key: 'standard' as const, label: '標準' },
              { key: 'high' as const, label: '高画質' },
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
        <Text className="text-sm font-semibold text-gray-500 mb-2">アプリ情報</Text>
        <Text className="text-base text-gray-900">MockMaker v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}
