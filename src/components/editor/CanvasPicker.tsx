import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEditorStore } from '@/stores/useEditorStore';
import { CANVAS_PRESETS, CanvasPresetId } from '@/constants/canvasPresets';
import { colors } from '@/constants/theme';

export function CanvasPicker() {
  const canvasPresetId = useEditorStore((s) => s.canvasPresetId);
  const setCanvasPresetId = useEditorStore((s) => s.setCanvasPresetId);

  const groups = ['ストア申請用', '汎用サイズ'] as const;

  return (
    <View style={{ borderTopWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white', maxHeight: 240 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        {groups.map((group) => (
          <View key={group} style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {group}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CANVAS_PRESETS.filter(p => p.group === group).map((preset) => {
                const isActive = canvasPresetId === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    onPress={() => setCanvasPresetId(preset.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: isActive ? colors.primary : '#e5e7eb',
                      backgroundColor: isActive ? colors.primary + '15' : 'white',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: isActive ? '700' : '400',
                      color: isActive ? colors.primary : '#374151',
                    }}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
