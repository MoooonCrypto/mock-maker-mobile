import { View, TouchableOpacity, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEditorStore } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';
import { t } from '@/i18n';

interface Props {
  onMediaPress: () => void;
}

const tools = [
  { key: 'frame'      as const, icon: 'phone-portrait-outline' as const, labelKey: 'toolbar.frame' },
  { key: 'background' as const, icon: 'color-palette-outline'  as const, labelKey: 'toolbar.background' },
  { key: 'text'       as const, icon: 'text-outline'           as const, labelKey: 'toolbar.text' },
  { key: 'sticker'    as const, icon: 'pricetag-outline'       as const, labelKey: 'toolbar.sticker' },
  { key: 'media'      as const, icon: 'image-outline'          as const, labelKey: 'toolbar.media' },
  { key: 'layers'     as const, icon: 'layers-outline'         as const, labelKey: 'toolbar.layers' },
] as const;

export function Toolbar({ onMediaPress }: Props) {
  const { activeTool, setActiveTool, selectedLayerId, removeLayer, selectLayer } = useEditorStore();

  const handlePress = (key: typeof tools[number]['key']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (key === 'media') { onMediaPress(); return; }
    setActiveTool(activeTool === key ? 'select' : key);
  };

  const hasSelection = !!selectedLayerId;

  const handleDelete = () => {
    if (!selectedLayerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    removeLayer(selectedLayerId);
    selectLayer(null);
  };

  return (
    <View className="bg-white border-t border-gray-200 flex-row justify-around py-2 px-2">
      {tools.map(({ key, icon, labelKey }) => {
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
              {t(labelKey)}
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
          {t('toolbar.delete')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
