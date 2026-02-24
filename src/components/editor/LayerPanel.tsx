import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';

export function LayerPanel() {
  const { layers, selectedLayerId, selectLayer, removeLayer } = useEditorStore();

  if (layers.length === 0) {
    return (
      <View className="bg-white border-t border-gray-200 px-4 py-4">
        <Text className="text-sm text-gray-400 text-center">レイヤーがありません</Text>
      </View>
    );
  }

  return (
    <View className="bg-white border-t border-gray-200 px-4 py-3">
      <Text className="text-sm font-semibold text-gray-500 mb-3">レイヤー</Text>
      <ScrollView style={{ maxHeight: 200 }}>
        {[...layers].reverse().map((layer) => {
          const isSelected = selectedLayerId === layer.id;
          return (
            <TouchableOpacity
              key={layer.id}
              onPress={() => selectLayer(isSelected ? null : layer.id)}
              className={`flex-row items-center py-3 px-3 rounded-lg mb-1 ${
                isSelected ? 'bg-blue-50' : ''
              }`}
            >
              <Ionicons
                name={layer.type === 'image' ? 'image-outline' : layer.type === 'video' ? 'videocam-outline' : 'text-outline'}
                size={18}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
              <Text
                className={`flex-1 ml-3 text-sm ${
                  isSelected ? 'text-primary font-medium' : 'text-gray-700'
                }`}
                numberOfLines={1}
              >
                {layer.type === 'image' ? '画像' : layer.type === 'video' ? '動画' : 'テキスト'}
              </Text>
              <TouchableOpacity onPress={() => removeLayer(layer.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
