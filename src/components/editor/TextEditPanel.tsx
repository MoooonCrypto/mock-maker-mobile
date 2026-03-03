import { View, Text, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { useEditorStore } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';

const FONT_SIZES  = [14, 18, 24, 32, 40, 56, 72];
const FONT_WEIGHTS = [
  { key: 'normal' as const, label: 'Regular' },
  { key: 'bold'   as const, label: 'Bold' },
  { key: 'black'  as const, label: 'Black' },
];
const TEXT_COLORS = ['#ffffff', '#1a1a1a', '#2b8cee', '#ef4444', '#22c55e', '#f59e0b', '#a855f7'];

export function TextEditPanel() {
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const layers          = useEditorStore((s) => s.layers);
  const updateLayer     = useEditorStore((s) => s.updateLayer);

  const layer = layers.find((l) => l.id === selectedLayerId && l.type === 'text');
  if (!layer) return null;

  const fontSize   = layer.size.height || 24;
  const fontWeight = layer.fontWeight  ?? 'normal';
  const textColor  = layer.textColor   ?? '#ffffff';

  return (
    <View className="bg-white border-t border-gray-200 px-4 pt-3 pb-4">
      <Text className="text-sm font-semibold text-gray-500 mb-3">テキスト編集</Text>

      {/* Font size */}
      <View className="mb-3">
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm text-gray-700">文字サイズ</Text>
          <Text className="text-sm text-gray-400">{fontSize}pt</Text>
        </View>
        <Slider
          minimumValue={12}
          maximumValue={80}
          step={1}
          value={fontSize}
          onValueChange={(v) => updateLayer(layer.id, { size: { width: layer.size.width, height: v } })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor="#e5e7eb"
          thumbTintColor={colors.primary}
        />
        {/* Quick size chips */}
        <View className="flex-row gap-2 mt-1 flex-wrap">
          {FONT_SIZES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => updateLayer(layer.id, { size: { width: layer.size.width, height: s } })}
              className={`px-2 py-1 rounded-md ${fontSize === s ? 'bg-primary' : 'bg-gray-100'}`}
            >
              <Text className={`text-xs font-medium ${fontSize === s ? 'text-white' : 'text-gray-600'}`}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Font weight */}
      <View className="mb-3">
        <Text className="text-sm text-gray-700 mb-2">ウェイト</Text>
        <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
          {FONT_WEIGHTS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => updateLayer(layer.id, { fontWeight: key })}
              className={`flex-1 py-2 items-center ${fontWeight === key ? 'bg-primary' : ''}`}
            >
              <Text className={`text-sm font-medium ${fontWeight === key ? 'text-white' : 'text-gray-600'}`}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Text color */}
      <View>
        <Text className="text-sm text-gray-700 mb-2">文字色</Text>
        <View className="flex-row gap-2">
          {TEXT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => updateLayer(layer.id, { textColor: c })}
              style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: c,
                borderWidth: textColor === c ? 3 : 1,
                borderColor: textColor === c ? colors.primary : '#e5e7eb',
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
