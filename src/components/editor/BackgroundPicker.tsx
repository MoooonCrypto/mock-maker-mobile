import { View, TouchableOpacity, ScrollView, Text } from 'react-native';
import { useEditorStore } from '@/stores/useEditorStore';
import { presetBackgrounds } from '@/constants/backgrounds';
import { Background } from '@/types';
import { colors } from '@/constants/theme';

export function BackgroundPicker() {
  const { background, setBackground } = useEditorStore();

  const handleSelect = (bg: Background) => {
    setBackground(bg);
  };

  return (
    <View className="bg-white border-t border-gray-200 px-4 py-3">
      <Text className="text-sm font-semibold text-gray-500 mb-3">背景</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {presetBackgrounds.map((bg, index) => {
          const isSelected =
            (bg.type === 'solid' && background.type === 'solid' && bg.color === background.color) ||
            (bg.type === 'gradient' &&
              background.type === 'gradient' &&
              bg.gradient?.colors[0] === background.gradient?.colors[0]);

          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleSelect(bg)}
              className={`w-12 h-12 rounded-xl mr-2 ${
                isSelected ? 'border-2 border-primary' : 'border border-gray-200'
              }`}
              style={
                bg.type === 'solid'
                  ? { backgroundColor: bg.color }
                  : bg.type === 'gradient' && bg.gradient
                  ? {
                      // Fallback to first gradient color; real gradient in native
                      backgroundColor: bg.gradient.colors[0],
                    }
                  : undefined
              }
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
