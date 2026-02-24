import { View, Text, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { useEditorStore } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';

export function ScreenshotEditor() {
  const { selectedLayerId, layers, updateLayer } = useEditorStore();
  const layer = layers.find((l) => l.id === selectedLayerId);

  if (!layer) {
    return (
      <View className="bg-white border-t border-gray-200 px-4 py-4">
        <Text className="text-sm text-gray-400 text-center">
          レイヤーを選択してください
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white border-t border-gray-200 px-4 py-3">
      <Text className="text-sm font-semibold text-gray-500 mb-3">スタイル調整</Text>

      {/* Corner Radius */}
      <View className="mb-4">
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm text-gray-700">角丸</Text>
          <Text className="text-sm text-gray-400">{Math.round(layer.cornerRadius)}px</Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={50}
          value={layer.cornerRadius}
          onValueChange={(v) => updateLayer(layer.id, { cornerRadius: v })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor="#e5e7eb"
          thumbTintColor={colors.primary}
        />
      </View>

      {/* Shadow */}
      <View className="mb-4">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm text-gray-700">影の深さ</Text>
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-400 mr-2">
              {Math.round(layer.shadow.opacity * 100)}%
            </Text>
            <TouchableOpacity
              onPress={() =>
                updateLayer(layer.id, {
                  shadow: { ...layer.shadow, enabled: !layer.shadow.enabled },
                })
              }
              className={`w-10 h-6 rounded-full justify-center ${
                layer.shadow.enabled ? 'bg-primary items-end' : 'bg-gray-300 items-start'
              }`}
            >
              <View className="w-5 h-5 bg-white rounded-full mx-0.5" />
            </TouchableOpacity>
          </View>
        </View>
        {layer.shadow.enabled && (
          <Slider
            minimumValue={0}
            maximumValue={1}
            value={layer.shadow.opacity}
            onValueChange={(v) =>
              updateLayer(layer.id, {
                shadow: { ...layer.shadow, opacity: v, blur: v * 30 },
              })
            }
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor={colors.primary}
          />
        )}
      </View>

      {/* Stroke */}
      <View className="mb-2">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm text-gray-700">枠線の太さ</Text>
          <Text className="text-sm text-gray-400">{Math.round(layer.stroke.width)}pt</Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={10}
          value={layer.stroke.width}
          onValueChange={(v) =>
            updateLayer(layer.id, {
              stroke: { ...layer.stroke, enabled: v > 0, width: v },
            })
          }
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor="#e5e7eb"
          thumbTintColor={colors.primary}
        />
      </View>

      {/* Stroke Color Presets */}
      {layer.stroke.enabled && (
        <View className="flex-row mt-1">
          {['#000000', '#ffffff', '#2b8cee', '#ef4444', '#22c55e', '#f59e0b'].map(
            (color) => (
              <TouchableOpacity
                key={color}
                onPress={() =>
                  updateLayer(layer.id, {
                    stroke: { ...layer.stroke, color },
                  })
                }
                className={`w-8 h-8 rounded-full mr-2 ${
                  layer.stroke.color === color ? 'border-2 border-primary' : 'border border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            )
          )}
        </View>
      )}
    </View>
  );
}
