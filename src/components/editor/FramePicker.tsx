import { View, Text, TouchableOpacity, PixelRatio } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import type { FrameId } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';
import { getPreset, getMaxFrameScale } from '@/constants/canvasPresets';

const FRAMES: { id: FrameId; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'none',       label: 'なし',       sub: 'フレームなし',   icon: 'close-circle-outline' },
  { id: 'iphone',     label: 'iPhone',     sub: 'スクリーン',     icon: 'phone-portrait-outline' },
  { id: 'app-icon',   label: 'App Icon',   sub: 'アイコン枠',     icon: 'grid-outline' },
];

export function FramePicker() {
  const selectedFrameId    = useEditorStore((s) => s.selectedFrameId);
  const setSelectedFrameId = useEditorStore((s) => s.setSelectedFrameId);
  const setActiveTool      = useEditorStore((s) => s.setActiveTool);
  const frameScale         = useEditorStore((s) => s.frameScale);
  const setFrameScale      = useEditorStore((s) => s.setFrameScale);
  const canvasPresetId     = useEditorStore((s) => s.canvasPresetId);
  const templateId         = useEditorStore((s) => s.templateId);
  const frameEnabled       = selectedFrameId !== 'none';

  const pixelRatio = PixelRatio.get();
  const _preset = getPreset(canvasPresetId);
  const canvasW = _preset.exportW / pixelRatio;
  const canvasH = templateId === 'split' ? (_preset.exportH / pixelRatio) / 2 : _preset.exportH / pixelRatio;
  const maxScale = getMaxFrameScale(canvasW, canvasH, templateId);

  return (
    <View className="bg-white border-t border-gray-200 px-4 py-3">
      <Text className="text-sm font-semibold text-gray-500 mb-3">フレーム</Text>

      {/* Frame type selection */}
      <View className="flex-row gap-2 mb-4">
        {FRAMES.map(({ id, label, sub, icon }) => {
          const isActive = selectedFrameId === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => { setSelectedFrameId(id); setActiveTool('select'); }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: isActive ? colors.primary : '#e5e7eb',
                backgroundColor: isActive ? '#eff6ff' : 'white',
              }}
            >
              <Ionicons name={icon} size={22} color={isActive ? colors.primary : colors.textSecondary} />
              <Text style={{ marginTop: 4, fontSize: 12, fontWeight: isActive ? '700' : '400', color: isActive ? colors.primary : '#374151' }}>
                {label}
              </Text>
              <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Frame scale slider (only when frame is enabled) */}
      {frameEnabled && (
        <View>
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs text-gray-500">フレームサイズ</Text>
            <Text className="text-xs font-medium text-gray-700">{Math.round(Math.min(frameScale, maxScale) * 100)}%</Text>
          </View>
          <Slider
            minimumValue={0.5}
            maximumValue={maxScale}
            step={0.01}
            value={Math.min(frameScale, maxScale)}
            onValueChange={setFrameScale}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor={colors.primary}
            style={{ height: 32 }}
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-400">50%</Text>
            <Text className="text-xs text-gray-400">{Math.round(maxScale * 100)}%</Text>
          </View>
        </View>
      )}
    </View>
  );
}
