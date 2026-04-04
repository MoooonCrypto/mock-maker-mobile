import { View, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
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
  { key: 'canvas'     as const, icon: 'crop-outline'           as const, labelKey: 'toolbar.canvas' },
  { key: 'background' as const, icon: 'color-palette-outline'  as const, labelKey: 'toolbar.background' },
  { key: 'text'       as const, icon: 'text-outline'           as const, labelKey: 'toolbar.text' },
  { key: 'sticker'    as const, icon: 'pricetag-outline'       as const, labelKey: 'toolbar.sticker' },
  { key: 'media'      as const, icon: 'image-outline'          as const, labelKey: 'toolbar.media' },
  { key: 'layers'     as const, icon: 'layers-outline'         as const, labelKey: 'toolbar.layers' },
] as const;

export function Toolbar({ onMediaPress }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const { activeTool, setActiveTool, selectedLayerId, removeLayer, selectLayer } = useEditorStore();
  const templateId = useEditorStore((s) => s.templateId);
  const compact = screenWidth <= 375;
  const iconSize = compact ? 20 : 22;
  const labelStyle = compact ? 'text-[10px]' : 'text-xs';
  const verticalPadding = compact ? 'py-0.5' : 'py-1';

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
    <View className={`bg-white border-t border-gray-200 flex-row ${compact ? 'py-1 px-0.5' : 'py-2 px-2'}`}>
      {tools.map(({ key, icon, labelKey }) => {
        const isActive = activeTool === key;
        const isDisabled = key === 'frame' && templateId === 'free';
        return (
          <TouchableOpacity
            key={key}
            onPress={() => !isDisabled && handlePress(key)}
            className={`items-center flex-1 min-w-0 ${verticalPadding} px-0.5`}
            style={isDisabled ? { opacity: 0.35 } : undefined}
          >
            <Ionicons
              name={icon}
              size={iconSize}
              color={isDisabled ? colors.textSecondary : isActive ? colors.primary : colors.textSecondary}
            />
            <Text
              className={`${labelStyle} mt-0.5 ${isActive && !isDisabled ? 'text-primary font-semibold' : 'text-gray-400'}`}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Delete button — always visible, active only when a layer is selected */}
      <TouchableOpacity
        onPress={handleDelete}
        className={`items-center flex-1 min-w-0 ${verticalPadding} px-0.5`}
      >
        <Ionicons name="trash-outline" size={iconSize} color={hasSelection ? '#ef4444' : '#d1d5db'} />
        <Text
          className={`${labelStyle} mt-0.5 ${hasSelection ? 'text-red-400' : 'text-gray-300'}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {t('toolbar.delete')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
