import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { devices } from '@/constants/devices';
import { presetBackgrounds } from '@/constants/backgrounds';
import { colors } from '@/constants/theme';
import type { DeviceFrame, Background } from '@/types';

interface Template {
  id: string;
  name: string;
  description: string;
  device: DeviceFrame;
  background: Background;
  icon: keyof typeof Ionicons.glyphMap;
}

const templates: Template[] = [
  {
    id: 'iphone-gradient-purple',
    name: 'iPhone（パープル）',
    description: 'iPhone 15 Pro + パープルグラデーション',
    device: devices.find((d) => d.deviceId === 'iphone-15-pro')!,
    background: presetBackgrounds[4],
    icon: 'phone-portrait-outline',
  },
  {
    id: 'iphone-gradient-blue',
    name: 'iPhone（ブルー）',
    description: 'iPhone 16 Pro + ブルーグラデーション',
    device: devices.find((d) => d.deviceId === 'iphone-16-pro')!,
    background: presetBackgrounds[6],
    icon: 'phone-portrait-outline',
  },
  {
    id: 'iphone-gradient-pink',
    name: 'iPhone（ピンク）',
    description: 'iPhone 15 + ピンクグラデーション',
    device: devices.find((d) => d.deviceId === 'iphone-15')!,
    background: presetBackgrounds[5],
    icon: 'phone-portrait-outline',
  },
  {
    id: 'ipad-gradient-green',
    name: 'iPad（グリーン）',
    description: 'iPad Pro 11" + グリーングラデーション',
    device: devices.find((d) => d.deviceId === 'ipad-pro-11')!,
    background: presetBackgrounds[7],
    icon: 'tablet-portrait-outline',
  },
  {
    id: 'macbook-dark',
    name: 'MacBook（ダーク）',
    description: 'MacBook Pro 14" + ダーク背景',
    device: devices.find((d) => d.deviceId === 'macbook-pro-14')!,
    background: presetBackgrounds[3],
    icon: 'laptop-outline',
  },
  {
    id: 'iphone-white',
    name: 'iPhone（ホワイト）',
    description: 'iPhone 16 Pro Max + ホワイト',
    device: devices.find((d) => d.deviceId === 'iphone-16-pro-max')!,
    background: presetBackgrounds[0],
    icon: 'phone-portrait-outline',
  },
  {
    id: 'macbook-gradient-warm',
    name: 'MacBook（ウォーム）',
    description: 'MacBook Pro 16" + ウォームグラデーション',
    device: devices.find((d) => d.deviceId === 'macbook-pro-16')!,
    background: presetBackgrounds[10],
    icon: 'laptop-outline',
  },
  {
    id: 'iphone-brand-blue',
    name: 'iPhone（ブランドブルー）',
    description: 'iPhone 14 Pro + ブランドブルー',
    device: devices.find((d) => d.deviceId === 'iphone-14-pro')!,
    background: presetBackgrounds[11],
    icon: 'phone-portrait-outline',
  },
];

function getBackgroundColor(bg: Background): string {
  if (bg.type === 'solid') return bg.color ?? '#ffffff';
  if (bg.type === 'gradient' && bg.gradient) return bg.gradient.colors[0];
  return '#f6f7f8';
}

export default function HomeScreen() {
  const router = useRouter();
  const { reset, setDeviceFrame, setBackground, setSessionName } = useEditorStore();

  const handleNewProject = () => {
    reset();
    router.push(`/editor/${Date.now()}`);
  };

  const handleSelectTemplate = (template: Template) => {
    reset();
    setSessionName(template.name);
    setDeviceFrame(template.device);
    setBackground(template.background);
    router.push(`/editor/${Date.now()}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">MockMaker</Text>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          hitSlop={8}
        >
          <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* New Project Button */}
        <View className="mx-5 mb-6">
          <TouchableOpacity
            onPress={handleNewProject}
            activeOpacity={0.8}
            className="bg-primary rounded-xl py-4 flex-row items-center justify-center"
            style={{
              shadowColor: '#2b8cee',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color="#fff" />
            <Text className="text-white font-semibold text-base ml-2">
              新規作成（空白）
            </Text>
          </TouchableOpacity>
        </View>

        {/* Templates */}
        <View className="px-5 mb-3">
          <Text className="text-lg font-bold text-gray-900">テンプレートから始める</Text>
          <Text className="text-sm text-gray-400 mt-0.5">
            デバイスと背景が設定済みのテンプレートを選択
          </Text>
        </View>

        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => {
            const bgColor = getBackgroundColor(item.background);
            const isDark =
              item.background.type === 'solid' &&
              item.background.color === '#0f0f0f';
            return (
              <TouchableOpacity
                onPress={() => handleSelectTemplate(item)}
                activeOpacity={0.7}
                className="flex-1 bg-white rounded-xl overflow-hidden"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
              >
                <View
                  className="h-28 items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                >
                  <Ionicons
                    name={item.icon}
                    size={44}
                    color={isDark ? '#ffffff' : '#1a1a1a50'}
                  />
                </View>
                <View className="p-3">
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
