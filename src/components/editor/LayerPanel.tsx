import { useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import type { FrameId } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';
import { t } from '@/i18n';

export function LayerPanel() {
  const { layers, selectedLayerId, selectLayer, removeLayer, selectedFrameId, setSelectedFrameId, background, setActiveTool } = useEditorStore();
  const frameEnabled = selectedFrameId !== 'none';

  // Remember the last active frame so toggling off/on restores it
  const prevFrameIdRef = useRef<FrameId>(frameEnabled ? selectedFrameId : 'iphone');
  const reversedLayers = useMemo(() => [...layers].reverse(), [layers]);

  const bgLabel =
    background.type === 'solid'    ? t('layers.bgSolid')    :
    background.type === 'gradient' ? t('layers.bgGradient') : t('layers.bgImage');

  return (
    <ScrollView style={{ maxHeight: 220 }} className="bg-white border-t border-gray-200">
      <View className="px-4 pt-3 pb-2">
        <Text className="text-sm font-semibold text-gray-500 mb-2">{t('layers.title')}</Text>

        {layers.length === 0 && (
          <Text className="text-xs text-gray-400 text-center py-2">{t('layers.empty')}</Text>
        )}
        {reversedLayers.map((layer) => {
          const isSel = selectedLayerId === layer.id;
          const label =
            layer.type === 'image' ? t('layers.typeImage') :
            layer.type === 'video' ? t('layers.typeVideo') :
            `${t('layers.typeText')}${layer.uri.slice(0, 12)}${layer.uri.length > 12 ? '…' : ''}`;
          const icon =
            layer.type === 'image' ? 'image-outline'   :
            layer.type === 'video' ? 'videocam-outline' : 'text-outline';

          return (
            <TouchableOpacity
              key={layer.id}
              onPress={() => selectLayer(isSel ? null : layer.id)}
              className={`flex-row items-center py-2.5 px-3 rounded-lg mb-1 ${isSel ? 'bg-blue-50' : ''}`}
            >
              <Ionicons name={icon} size={17} color={isSel ? colors.primary : colors.textSecondary} />
              <Text
                className={`flex-1 ml-3 text-sm ${isSel ? 'text-primary font-medium' : 'text-gray-700'}`}
                numberOfLines={1}
              >
                {label}
              </Text>
              <TouchableOpacity onPress={() => removeLayer(layer.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <View className="h-px bg-gray-100 my-1" />

        {/* Background */}
        <TouchableOpacity
          onPress={() => setActiveTool('background')}
          className="flex-row items-center py-2.5 px-3 rounded-lg mb-1 bg-gray-50"
        >
          <Ionicons name="color-palette-outline" size={17} color={colors.textSecondary} />
          <Text className="flex-1 ml-3 text-sm text-gray-500" numberOfLines={1}>
            {t('layers.bgLabel')} ({bgLabel})
          </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Frame toggle */}
        <TouchableOpacity
          onPress={() => {
            if (frameEnabled) {
              prevFrameIdRef.current = selectedFrameId;
              setSelectedFrameId('none');
            } else {
              setSelectedFrameId(prevFrameIdRef.current);
            }
          }}
          className="flex-row items-center py-2.5 px-3 rounded-lg mb-1 bg-gray-50"
        >
          <Ionicons name="phone-portrait-outline" size={17} color={colors.textSecondary} />
          <Text className="flex-1 ml-3 text-sm text-gray-500">
            {t('layers.frame')}
          </Text>
          <View
            className={`w-10 h-6 rounded-full justify-center ${frameEnabled ? 'bg-primary items-end' : 'bg-gray-300 items-start'}`}
          >
            <View className="w-5 h-5 bg-white rounded-full mx-0.5" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
