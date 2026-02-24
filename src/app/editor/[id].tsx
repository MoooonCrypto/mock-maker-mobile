import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useEditorStore, createDefaultLayer } from '@/stores/useEditorStore';
import { Canvas } from '@/components/editor/Canvas';
import { GestureCanvas } from '@/components/editor/GestureCanvas';
import { VideoOverlay } from '@/components/editor/VideoOverlay';
import { Toolbar } from '@/components/editor/Toolbar';
import { BackgroundPicker } from '@/components/editor/BackgroundPicker';
import { ScreenshotEditor } from '@/components/editor/ScreenshotEditor';
import { LayerPanel } from '@/components/editor/LayerPanel';
import { colors } from '@/constants/theme';

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth = screenWidth;
  const canvasHeight = screenWidth * 1.5;

  const {
    sessionName,
    addLayer,
    activeTool,
    reset,
  } = useEditorStore();

  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    return () => reset();
  }, [id]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const layer = createDefaultLayer('image', asset.uri, {
        width: asset.width,
        height: asset.height,
      });
      addLayer(layer);
    }
  };

  const handlePickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const layer = createDefaultLayer('video', asset.uri, {
        width: asset.width ?? 1080,
        height: asset.height ?? 1920,
      });
      addLayer(layer);
    }
  };

  const handleAddText = () => {
    if (!textInput.trim()) return;
    const layer = createDefaultLayer('text', textInput.trim(), {
      width: 200,
      height: 32,
    });
    addLayer(layer);
    setTextInput('');
    setTextModalVisible(false);
  };

  const handleMediaPick = () => {
    Alert.alert('メディアを追加', '追加するメディアの種類を選択', [
      { text: '画像', onPress: handlePickImage },
      { text: '動画', onPress: handlePickVideo },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
          {sessionName}
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={handleMediaPick} hitSlop={8}>
            <Ionicons name="image-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/export/${id}`)}
            hitSlop={8}
          >
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas area with gesture controls and video overlay */}
      <View style={{ width: canvasWidth, height: canvasHeight }}>
        <GestureCanvas>
          <Canvas />
        </GestureCanvas>
        <VideoOverlay />
      </View>

      {/* Tool Panels */}
      {activeTool === 'background' && <BackgroundPicker />}
      {activeTool === 'canvas' && <ScreenshotEditor />}
      {activeTool === 'layers' && <LayerPanel />}
      {activeTool === 'text' && (
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <Text className="text-sm font-semibold text-gray-500 mb-3">テキスト</Text>
          <TouchableOpacity
            onPress={() => setTextModalVisible(true)}
            className="bg-primary rounded-xl py-3 items-center"
          >
            <Text className="text-white font-semibold">テキストを追加</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toolbar */}
      <Toolbar
        onFrameSelect={() => router.push('/editor/frame-select')}
      />

      {/* Text Input Modal */}
      <Modal visible={textModalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl px-5 pt-5 pb-10">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">テキストを追加</Text>
              <TouchableOpacity onPress={() => setTextModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={textInput}
              onChangeText={setTextInput}
              placeholder="テキストを入力..."
              placeholderTextColor={colors.textSecondary}
              className="bg-gray-100 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              autoFocus
              multiline
            />
            <TouchableOpacity
              onPress={handleAddText}
              className="bg-primary rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
