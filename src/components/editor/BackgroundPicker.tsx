import { useState, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, Text, Modal } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import { runOnJS } from 'react-native-reanimated';
import { useEditorStore } from '@/stores/useEditorStore';
import { t } from '@/i18n';
import { presetBackgrounds } from '@/constants/backgrounds';
import { Background } from '@/types';
import { colors } from '@/constants/theme';
import { pickImage } from '@/utils/media';

export function BackgroundPicker() {
  const { background, setBackground } = useEditorStore();
  const [pickerVisible, setPickerVisible] = useState(false);

  const currentHex =
    background.type === 'solid' ? background.color ?? '#ffffff' : '#ffffff';

  const applyColor = useCallback((hex: string) => {
    setBackground({ type: 'solid', color: hex });
  }, [setBackground]);

  const onColorComplete = useCallback(({ hex }: { hex: string }) => {
    'worklet';
    runOnJS(applyColor)(hex);
  }, [applyColor]);

  const handleSelect = (bg: Background) => setBackground(bg);

  const handlePickImage = async () => {
    const asset = await pickImage();
    if (asset) {
      setBackground({ type: 'image', imageUri: asset.uri });
    }
  };

  const isImageBg = background.type === 'image';

  return (
    <View className="bg-white border-t border-gray-200 px-4 py-3">
      <Text className="text-sm font-semibold text-gray-500 mb-3">{t('background.title')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>

        {/* Full color picker button — leftmost */}
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          className="w-12 h-12 rounded-xl mr-2 items-center justify-center border border-gray-200"
          style={{ overflow: 'hidden' }}
        >
          {/* Rainbow gradient strip faked with colored slices */}
          <View style={{ width: 48, height: 48, borderRadius: 11, overflow: 'hidden', flexDirection: 'row' }}>
            {['#ff0000','#ff8800','#ffff00','#00cc00','#0088ff','#8800ff'].map((c, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>
        </TouchableOpacity>

        {/* Image picker button */}
        <TouchableOpacity
          onPress={handlePickImage}
          className={`w-12 h-12 rounded-xl mr-2 items-center justify-center ${
            isImageBg ? 'border-2 border-primary' : 'border border-gray-200'
          }`}
          style={{ backgroundColor: '#f3f4f6' }}
        >
          <Ionicons name="image-outline" size={22} color={isImageBg ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>

        {/* Preset backgrounds */}
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
                  ? { backgroundColor: bg.gradient.colors[0] }
                  : undefined
              }
            />
          );
        })}
      </ScrollView>

      {/* Color Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111' }}>{t('background.colorPickerTitle')}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ColorPicker
              value={currentHex}
              onComplete={onColorComplete}
              style={{ gap: 12 }}
            >
              <Preview style={{ height: 40, borderRadius: 10 }} />
              <Panel1 style={{ borderRadius: 10, height: 200 }} />
              <HueSlider style={{ borderRadius: 10 }} />
            </ColorPicker>

            <TouchableOpacity
              onPress={() => setPickerVisible(false)}
              style={{ marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>{t('background.colorPickerOk')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
