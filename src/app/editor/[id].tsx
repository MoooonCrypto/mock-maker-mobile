import { useEffect, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { View, Text, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useEditorStore, createDefaultLayer } from '@/stores/useEditorStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { Canvas } from '@/components/editor/Canvas';
import { GestureCanvas } from '@/components/editor/GestureCanvas';
import { Toolbar } from '@/components/editor/Toolbar';
import { BackgroundPicker } from '@/components/editor/BackgroundPicker';
import { LayerPanel } from '@/components/editor/LayerPanel';
import { TextEditPanel } from '@/components/editor/TextEditPanel';
import { FramePicker } from '@/components/editor/FramePicker';
import { ImageCropModal } from '@/components/editor/ImageCropModal';
import { colors } from '@/constants/theme';

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    sessionName,
    addLayer,
    selectLayer,
    activeTool,
    setActiveTool,
    layers,
    selectedLayerId,
    selectedFrameId,
    background,
    frameScreenRect,
    reset,
  } = useEditorStore();

  const frameEnabled = selectedFrameId !== 'none';
  const saveProject  = useProjectStore((s) => s.saveProject);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const selectedIsText = selectedLayer?.type === 'text';

  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);
  const pinchScale  = useSharedValue(1);

  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Crop modal state
  const [cropPending, setCropPending] = useState<{
    uri: string; width: number; height: number; type: 'image' | 'video';
  } | null>(null);

  useEffect(() => {
    return () => reset();
  }, [id]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProject({
        id,
        name: sessionName,
        layers,
        background,
        selectedFrameId,
      });
      Alert.alert('保存完了', `「${sessionName}」を保存しました`);
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOptions = () => {
    Alert.alert('保存 / 書き出し', null, [
      { text: 'プロジェクトを保存', onPress: handleSave },
      { text: '書き出し / 共有', onPress: () => router.push(`/export/${id}`) },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  const openTextModal = () => {
    setTextInput('');
    setTextModalVisible(true);
  };

  const handleAddText = () => {
    if (!textInput.trim()) return;
    const layer = createDefaultLayer('text', textInput.trim(), { width: 200, height: 32 });
    addLayer(layer);
    setTextInput('');
    setTextModalVisible(false);
    setActiveTool('select');
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (!frameEnabled) {
        // No frame: add image at natural size, no crop
        addLayer(createDefaultLayer('image', asset.uri, {
          width: asset.width,
          height: asset.height,
        }));
      } else {
        setCropPending({ uri: asset.uri, width: asset.width, height: asset.height, type: 'image' });
      }
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Videos always skip crop modal — added directly
      addLayer(createDefaultLayer('video', asset.uri, {
        width: asset.width ?? 1080,
        height: asset.height ?? 1920,
      }));
    }
  };

  const handleMediaPick = () => {
    Alert.alert('メディアを追加', '追加するメディアの種類を選択', [
      { text: '画像', onPress: pickImage },
      { text: '動画', onPress: pickVideo },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  const handleCropConfirm = (crop: { cropX: number; cropY: number; cropW: number; cropH: number }) => {
    if (!cropPending) return;
    const layer = createDefaultLayer('image', cropPending.uri, {
      width: cropPending.width,
      height: cropPending.height,
    });
    addLayer({ ...layer, ...crop });
    setCropPending(null);
  };

  // Compute screen aspect ratio for the crop modal preview
  const screenAspectRatio = frameScreenRect
    ? frameScreenRect.height / frameScreenRect.width
    : 16 / 9;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
          {sessionName}
        </Text>
        <TouchableOpacity onPress={handleSaveOptions} disabled={saving} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={saving ? '#d1d5db' : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Canvas area */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <GestureCanvas dragOffsetX={dragOffsetX} dragOffsetY={dragOffsetY} pinchScale={pinchScale}>
          <Canvas dragOffsetX={dragOffsetX} dragOffsetY={dragOffsetY} pinchScale={pinchScale} />
        </GestureCanvas>
        {/* Tap outside to close any open menu panel */}
        {activeTool !== 'select' && (
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setActiveTool('select')}
            activeOpacity={1}
          />
        )}
      </View>

      {/* Bottom controls */}
      <View style={{ backgroundColor: 'white' }}>
        {activeTool === 'background' && <BackgroundPicker />}
        {activeTool === 'frame' && <FramePicker />}
        {activeTool === 'layers' && <LayerPanel />}
        {activeTool === 'text' && !selectedIsText && (
          <View className="bg-white border-t border-gray-200 px-4 py-3">
            <Text className="text-sm font-semibold text-gray-500 mb-3">テキスト</Text>
            <TouchableOpacity
              onPress={openTextModal}
              className="bg-primary rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">テキストを追加</Text>
            </TouchableOpacity>
          </View>
        )}
        {selectedIsText && activeTool === 'text' && (
          <TextEditPanel onClose={() => { selectLayer(null); setActiveTool('select'); }} />
        )}

        <Toolbar onMediaPress={handleMediaPick} />
      </View>

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

      {/* Image / Video Crop Modal */}
      {cropPending && (
        <ImageCropModal
          visible={true}
          imageUri={cropPending.uri}
          imageWidth={cropPending.width}
          imageHeight={cropPending.height}
          screenAspectRatio={screenAspectRatio}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropPending(null)}
        />
      )}
    </SafeAreaView>
  );
}
