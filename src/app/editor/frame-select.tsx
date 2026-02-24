import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { devices, deviceCategories } from '@/constants/devices';
import { colors } from '@/constants/theme';
import { DeviceFrame } from '@/types';

export default function FrameSelectScreen() {
  const router = useRouter();
  const setDeviceFrame = useEditorStore((s) => s.setDeviceFrame);
  const currentFrame = useEditorStore((s) => s.deviceFrame);

  const [selectedCategory, setSelectedCategory] = useState<DeviceFrame['category']>('iphone');
  const [search, setSearch] = useState('');

  const filteredDevices = useMemo(() => {
    let filtered = devices.filter((d) => d.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [selectedCategory, search]);

  const handleSelect = (device: DeviceFrame) => {
    setDeviceFrame(device);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 ml-2">デバイスを選択</Text>
      </View>

      {/* Category Tabs */}
      <View className="flex-row px-4 mb-3">
        {deviceCategories.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setSelectedCategory(key)}
            className={`mr-2 px-4 py-2 rounded-full ${
              selectedCategory === key ? 'bg-primary' : 'bg-white'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                selectedCategory === key ? 'text-white' : 'text-gray-600'
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View className="mx-4 mb-3 bg-white rounded-xl flex-row items-center px-3 py-2">
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="デバイスを検索..."
          placeholderTextColor={colors.textSecondary}
          className="flex-1 ml-2 text-base text-gray-900"
        />
      </View>

      {/* Device Grid */}
      <FlatList
        data={filteredDevices}
        keyExtractor={(item) => item.deviceId}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        columnWrapperStyle={{ gap: 12 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => {
          const isSelected = currentFrame?.deviceId === item.deviceId;
          return (
            <TouchableOpacity
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
              className={`flex-1 bg-white rounded-xl p-4 items-center ${
                isSelected ? 'border-2 border-primary' : ''
              }`}
            >
              <View className="w-16 h-24 bg-gray-100 rounded-lg items-center justify-center mb-2">
                <Ionicons
                  name={
                    item.category === 'iphone'
                      ? 'phone-portrait-outline'
                      : item.category === 'ipad'
                      ? 'tablet-portrait-outline'
                      : 'laptop-outline'
                  }
                  size={32}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text className="text-sm font-medium text-gray-900 text-center" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {item.screenSize.width} × {item.screenSize.height}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
