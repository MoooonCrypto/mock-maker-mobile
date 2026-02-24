import { View, TouchableOpacity, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';

interface Props {
  onFrameSelect: () => void;
}

const tools = [
  { key: 'frame' as const, icon: 'phone-portrait-outline' as const, label: 'フレーム' },
  { key: 'background' as const, icon: 'color-palette-outline' as const, label: '背景' },
  { key: 'text' as const, icon: 'text-outline' as const, label: 'テキスト' },
  { key: 'canvas' as const, icon: 'resize-outline' as const, label: 'キャンバス' },
  { key: 'layers' as const, icon: 'layers-outline' as const, label: 'レイヤー' },
] as const;

export function Toolbar({ onFrameSelect }: Props) {
  const { activeTool, setActiveTool } = useEditorStore();

  const handlePress = (key: typeof tools[number]['key']) => {
    if (key === 'frame') {
      onFrameSelect();
      return;
    }
    setActiveTool(activeTool === key ? 'select' : key);
  };

  return (
    <View className="bg-white border-t border-gray-200 flex-row justify-around py-2 px-2">
      {tools.map(({ key, icon, label }) => {
        const isActive = activeTool === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => handlePress(key)}
            className="items-center py-1 px-3"
          >
            <Ionicons
              name={icon}
              size={22}
              color={isActive ? colors.primary : colors.textSecondary}
            />
            <Text
              className={`text-xs mt-0.5 ${
                isActive ? 'text-primary font-semibold' : 'text-gray-400'
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
