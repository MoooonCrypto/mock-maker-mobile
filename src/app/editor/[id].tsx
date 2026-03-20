import { useEffect, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { View, Text, TouchableOpacity, Alert, TextInput, Modal, ActivityIndicator, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { ImageFormat } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { useEditorStore, createDefaultLayer } from '@/stores/useEditorStore';
import { composeVideoWithFrame } from '@/services/videoCompositing';
import { Canvas } from '@/components/editor/Canvas';
import { GestureCanvas } from '@/components/editor/GestureCanvas';
import { Toolbar } from '@/components/editor/Toolbar';
import { BackgroundPicker } from '@/components/editor/BackgroundPicker';
import { LayerPanel } from '@/components/editor/LayerPanel';
import { TextEditPanel } from '@/components/editor/TextEditPanel';
import { FramePicker } from '@/components/editor/FramePicker';
import { StickerPicker } from '@/components/editor/StickerPicker';
import { ImageCropModal } from '@/components/editor/ImageCropModal';
import { colors } from '@/constants/theme';
import MobileAds, {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-2543814564794464/2351282112';

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth } = useWindowDimensions();

  const {
    addLayer,
    removeLayer,
    selectLayer,
    activeTool,
    setActiveTool,
    layers,
    selectedLayerId,
    selectedFrameId,
    frameScreenRect,
    canvasRef,
    reset,
  } = useEditorStore();

  const frameEnabled = selectedFrameId !== 'none';

  const selectedLayer  = layers.find((l) => l.id === selectedLayerId);
  const selectedIsText = selectedLayer?.type === 'text';

  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);
  const pinchScale  = useSharedValue(1);
  const frameDragX  = useSharedValue(0);
  const frameDragY  = useSharedValue(0);
  const framePinchS = useSharedValue(1);

  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [busy, setBusy] = useState(false);

  const [cropPending, setCropPending] = useState<{
    uri: string; width: number; height: number;
  } | null>(null);

  // ─── Interstitial Ad ───────────────────────────────────────────────────────
  const adLoadedRef     = useRef(false);
  const pendingAlertRef = useRef<{ title: string; msg: string } | null>(null);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const retryTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef   = useRef(0);
  const MAX_RETRIES = 4;
  const RETRY_DELAY_MS = 4000;

  useEffect(() => {
    const instance = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    interstitialRef.current = instance;

    const unsubLoad = instance.addAdEventListener(AdEventType.LOADED, () => {
      retryCountRef.current = 0;
      adLoadedRef.current = true;
    });
    const unsubError = instance.addAdEventListener(AdEventType.ERROR, () => {
      adLoadedRef.current = false;
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(() => instance.load(), RETRY_DELAY_MS);
      }
    });
    const unsubClose = instance.addAdEventListener(AdEventType.CLOSED, () => {
      adLoadedRef.current = false;
      retryCountRef.current = 0;
      instance.load();
      if (pendingAlertRef.current) {
        Alert.alert(pendingAlertRef.current.title, pendingAlertRef.current.msg);
        pendingAlertRef.current = null;
      }
    });

    MobileAds().initialize().then(() => {
      instance.load();
    });

    return () => {
      unsubLoad(); unsubError(); unsubClose();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => reset();
  }, [id, reset]);

  // ─── Ad helper ─────────────────────────────────────────────────────────────

  const showAdThenAlert = (title: string, msg: string) => {
    if (adLoadedRef.current && interstitialRef.current) {
      pendingAlertRef.current = { title, msg };
      interstitialRef.current.show();
    } else {
      Alert.alert(title, msg);
    }
  };

  // ─── Export ────────────────────────────────────────────────────────────────

  const exportTo = async (target: 'photos' | 'files') => {
    if (!canvasRef?.current) {
      Alert.alert('エラー', 'キャンバスが見つかりません');
      return;
    }
    setBusy(true);
    try {
      if (target === 'photos') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('権限エラー', 'フォトライブラリへのアクセスを許可してください');
          return;
        }
      }

      const snap = await canvasRef.current.makeImageSnapshotAsync();
      if (!snap) throw new Error('スナップショット取得に失敗しました');

      const videoLayer = layers.find((l) => l.type === 'video');

      if (videoLayer) {
        // ── 動画レイヤーがある場合: MP4 で書き出す ──
        const bgEncoded = snap.encodeToBase64(ImageFormat.PNG, 100);
        const bgFile    = new File(Paths.cache, `frame_bg_${Date.now()}.png`);
        bgFile.write(bgEncoded, { encoding: 'base64' });

        const canvasHeight = screenWidth * 1.5;
        const screenRect   = (frameEnabled && frameScreenRect)
          ? frameScreenRect
          : { x: 0, y: 0, width: screenWidth, height: canvasHeight };

        const outputUri = await composeVideoWithFrame({
          bgImageUri: bgFile.uri,
          videoUri:   videoLayer.uri,
          screenRect,
        });

        if (target === 'photos') {
          await MediaLibrary.saveToLibraryAsync(outputUri);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          showAdThenAlert('完了', '動画を写真アプリに保存しました');
        } else {
          await Sharing.shareAsync(outputUri, { mimeType: 'video/mp4' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          showAdThenAlert('完了', '共有しました');
        }
      } else {
        // ── 画像のみ: PNG で書き出す ──
        const encoded = snap.encodeToBase64(ImageFormat.PNG, 100);
        const file    = new File(Paths.cache, `mockup_${Date.now()}.png`);
        file.write(encoded, { encoding: 'base64' });

        if (target === 'photos') {
          await MediaLibrary.saveToLibraryAsync(file.uri);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          showAdThenAlert('完了', '写真アプリに保存しました');
        } else {
          await Sharing.shareAsync(file.uri, { mimeType: 'image/png' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          showAdThenAlert('完了', '共有しました');
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('エラー', `書き出しに失敗しました\n${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveOptions = () => {
    Alert.alert('書き出し', undefined, [
      { text: '写真アプリに保存', onPress: () => exportTo('photos') },
      { text: 'ファイルに保存 / 共有', onPress: () => exportTo('files') },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  // ─── Text ──────────────────────────────────────────────────────────────────

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

  // ─── Media pick ────────────────────────────────────────────────────────────

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (frameEnabled) {
        setCropPending({ uri: asset.uri, width: asset.width, height: asset.height });
      } else {
        addLayer(createDefaultLayer('image', asset.uri, { width: asset.width, height: asset.height }));
      }
    }
  };

  const handleCropConfirm = (crop: { cropX: number; cropY: number; cropW: number; cropH: number }) => {
    if (!cropPending) return;
    // Remove existing image/video layers so new media replaces the old one
    layers.filter((l) => l.type === 'image' || l.type === 'video').forEach((l) => removeLayer(l.id));
    const layer = createDefaultLayer('image', cropPending.uri, {
      width: cropPending.width,
      height: cropPending.height,
    });
    addLayer({ ...layer, ...crop });
    setCropPending(null);
  };

  const screenAspectRatio = frameScreenRect
    ? frameScreenRect.height / frameScreenRect.width
    : 16 / 9;

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Remove existing image/video layers so new media replaces the old one
      layers.filter((l) => l.type === 'image' || l.type === 'video').forEach((l) => removeLayer(l.id));
      addLayer(createDefaultLayer('video', asset.uri, {
        width:  asset.width  ?? 1080,
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

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleSaveOptions} disabled={busy} hitSlop={8}>
          {busy
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="arrow-up-circle-outline" size={26} color={colors.primary} />
          }
        </TouchableOpacity>
      </View>

      {/* Canvas area */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <GestureCanvas dragOffsetX={dragOffsetX} dragOffsetY={dragOffsetY} pinchScale={pinchScale} frameDragX={frameDragX} frameDragY={frameDragY} framePinchS={framePinchS}>
          <Canvas dragOffsetX={dragOffsetX} dragOffsetY={dragOffsetY} pinchScale={pinchScale} frameDragX={frameDragX} frameDragY={frameDragY} framePinchS={framePinchS} />
        </GestureCanvas>
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
        {activeTool === 'frame'      && <FramePicker />}
        {activeTool === 'sticker'    && <StickerPicker />}
        {activeTool === 'layers'     && <LayerPanel />}
        {activeTool === 'text' && !selectedIsText && (
          <View className="bg-white border-t border-gray-200 px-4 py-3">
            <Text className="text-sm font-semibold text-gray-500 mb-3">テキスト</Text>
            <TouchableOpacity onPress={openTextModal} className="bg-primary rounded-xl py-3 items-center">
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
            <TouchableOpacity onPress={handleAddText} className="bg-primary rounded-xl py-3 items-center">
              <Text className="text-white font-semibold">追加</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

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
