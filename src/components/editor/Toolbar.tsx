import { View, TouchableOpacity, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';

interface Props {
  onMediaPress: () => void;
}

const tools = [
  { key: 'frame'      as const, icon: 'phone-portrait-outline' as const, label: 'フレーム' },
  { key: 'background' as const, icon: 'color-palette-outline'  as const, label: '背景' },
  { key: 'text'       as const, icon: 'text-outline'           as const, label: 'テキスト' },
  { key: 'sticker'    as const, icon: 'pricetag-outline'       as const, label: 'スタンプ' },
  { key: 'media'      as const, icon: 'image-outline'          as const, label: 'メディア' },
  { key: 'layers'     as const, icon: 'layers-outline'         as const, label: 'レイヤー' },
] as const;

export function Toolbar({ onMediaPress }: Props) {
  const { activeTool, setActiveTool, selectedLayerId, removeLayer, selectLayer } = useEditorStore();

  const handlePress = (key: typeof tools[number]['key']) => {
    if (key === 'media') { onMediaPress(); return; }
    setActiveTool(activeTool === key ? 'select' : key);
  };

  const hasSelection = !!selectedLayerId;

  const handleDelete = () => {
    if (selectedLayerId) {
      removeLayer(selectedLayerId);
      selectLayer(null);
    }
  };

  return (
    <View className="bg-white border-t border-gray-200 flex-row justify-around py-2 px-2">
      {tools.map(({ key, icon, label }) => {
        const isActive = activeTool === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => handlePress(key)}
            className="items-center py-1 px-2"
          >
            <Ionicons
              name={icon}
              size={22}
              color={isActive ? colors.primary : colors.textSecondary}
            />
            <Text className={`text-xs mt-0.5 ${isActive ? 'text-primary font-semibold' : 'text-gray-400'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Delete button — always visible, active only when a layer is selected */}
      <TouchableOpacity
        onPress={handleDelete}
        className="items-center py-1 px-2"
      >
        <Ionicons name="trash-outline" size={22} color={hasSelection ? '#ef4444' : '#d1d5db'} />
        <Text className={`text-xs mt-0.5 ${hasSelection ? 'text-red-400' : 'text-gray-300'}`}>
          ゴミ箱
        </Text>
      </TouchableOpacity>
    </View>
  );
}
