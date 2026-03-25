import { useEffect, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { View, Text, TouchableOpacity, Alert, TextInput, Modal, ActivityIndicator, useWindowDimensions, KeyboardAvoidingView, Platform, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { ImageFormat } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { useEditorStore, createDefaultLayer } from '@/stores/useEditorStore';
import { getCanvasHeight } from '@/constants/templates';
import { t } from '@/i18n';
import { Canvas } from '@/components/editor/Canvas';
import { GestureCanvas } from '@/components/editor/GestureCanvas';
import { Toolbar } from '@/components/editor/Toolbar';
import { BackgroundPicker } from '@/components/editor/BackgroundPicker';
import { LayerPanel } from '@/components/editor/LayerPanel';
import { TextEditPanel } from '@/components/editor/TextEditPanel';
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

// ─── Shared slider hook ───────────────────────────────────────────────────────

function useSliderPanResponder(onChange: (ratio: number) => void) {
  const trackWRef = useRef(300);
  const viewPageXRef = useRef(0);
  const trackViewRef = useRef<any>(null);

  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const r = Math.max(0, Math.min(1, (e.nativeEvent.pageX - viewPageXRef.current) / trackWRef.current));
      onChange(r);
    },
    onPanResponderMove: (e) => {
      const r = Math.max(0, Math.min(1, (e.nativeEvent.pageX - viewPageXRef.current) / trackWRef.current));
      onChange(r);
    },
  })).current;

  const onLayout = (e: any) => {
    trackWRef.current = e.nativeEvent.layout.width;
    trackViewRef.current?.measure((_x: number, _y: number, _w: number, _h: number, px: number) => {
      viewPageXRef.current = px;
    });
  };

  return { pr, trackViewRef, trackWRef, onLayout };
}

// ─── Frame size slider panel ──────────────────────────────────────────────────

function FrameSizePanel() {
  const frameScale = useEditorStore((s) => s.frameScale);
  const [trackW, setTrackW] = useState(300);

  const { pr, trackViewRef, onLayout } = useSliderPanResponder((r) => {
    useEditorStore.getState().setFrameScale(0.3 + r * 1.7);
  });

  const pct = Math.max(0, Math.min(1, (frameScale - 0.3) / 1.7));

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderColor: '#e5e7eb' }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>
        {t('editor.frameSizeLabel', { pct: Math.round(frameScale * 100) })}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 11, color: '#9ca3af' }}>{t('editor.frameSizeSmall')}</Text>
        <View
          ref={trackViewRef}
          style={{ flex: 1, height: 40, justifyContent: 'center' }}
          onLayout={(e) => { onLayout(e); setTrackW(e.nativeEvent.layout.width); }}
          {...pr.panHandlers}
        >
          <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 }}>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%` as any, backgroundColor: colors.primary, borderRadius: 2 }} />
          </View>
          <View style={{
            position: 'absolute',
            left: pct * trackW - 10,
            top: 10,
            width: 20, height: 20,
            borderRadius: 10,
            backgroundColor: colors.primary,
            borderWidth: 2, borderColor: 'white',
          }} />
        </View>
        <Text style={{ fontSize: 11, color: '#9ca3af' }}>{t('editor.frameSizeLarge')}</Text>
      </View>
    </View>
  );
}

// ─── Split position slider panel ──────────────────────────────────────────────

function SplitPositionPanel() {
  const framePosition = useEditorStore((s) => s.framePosition);
  const [trackW, setTrackW] = useState(300);

  const { pr, trackViewRef, onLayout } = useSliderPanResponder((r) => {
    const state = useEditorStore.getState();
    state.setFramePosition({ x: (r - 0.5) * 300, y: state.framePosition.y });
  });

  // Map x (-150 to +150) → pct (0 to 1)
  const pct = Math.max(0, Math.min(1, (framePosition.x + 150) / 300));

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderColor: '#e5e7eb' }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>
        {t('editor.framePosLabel')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 11, color: '#9ca3af' }}>{t('editor.framePosLeft')}</Text>
        <View
          ref={trackViewRef}
          style={{ flex: 1, height: 40, justifyContent: 'center' }}
          onLayout={(e) => { onLayout(e); setTrackW(e.nativeEvent.layout.width); }}
          {...pr.panHandlers}
        >
          <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 }}>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%` as any, backgroundColor: colors.primary, borderRadius: 2 }} />
          </View>
          {/* center marker */}
          <View style={{ position: 'absolute', left: '50%', top: 8, width: 1, height: 8, backgroundColor: '#d1d5db' }} />
          <View style={{
            position: 'absolute',
            left: pct * trackW - 10,
            top: 10,
            width: 20, height: 20,
            borderRadius: 10,
            backgroundColor: colors.primary,
            borderWidth: 2, borderColor: 'white',
          }} />
        </View>
        <Text style={{ fontSize: 11, color: '#9ca3af' }}>{t('editor.framePosRight')}</Text>
      </View>
    </View>
  );
}

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();

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
    templateId,
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
    uri: string; width: number; height: number; frameSlot?: 0 | 1;
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

  const canvasHeight = getCanvasHeight(screenWidth, templateId);

  const exportTo = async (target: 'photos' | 'files') => {
    if (!canvasRef?.current) {
      Alert.alert(t('editor.errTitle'), t('editor.errCanvasNotFound'));
      return;
    }
    setBusy(true);
    try {
      if (target === 'photos') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('editor.errPermissionTitle'), t('editor.errPermission'));
          return;
        }
      }

      if (templateId === 'split') {
        const halfW = Math.round(screenWidth / 2);
        const bounds = [
          { x: 0,     y: 0, width: halfW, height: canvasHeight },
          { x: halfW, y: 0, width: halfW, height: canvasHeight },
        ];
        const ts = Date.now();
        for (let i = 0; i < bounds.length; i++) {
          const snap = await canvasRef.current.makeImageSnapshotAsync(bounds[i]);
          if (!snap) throw new Error(`${t('editor.errSnapshotFailed')} (${i + 1})`);
          const encoded = snap.encodeToBase64(ImageFormat.PNG, 100);
          const file = new File(Paths.cache, `mockup_${ts}_${i + 1}.png`);
          file.write(encoded, { encoding: 'base64' });
          if (target === 'photos') {
            await MediaLibrary.saveToLibraryAsync(file.uri);
          } else {
            await Sharing.shareAsync(file.uri, { mimeType: 'image/png' });
          }
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (target === 'photos') showAdThenAlert(t('editor.doneTitle'), t('editor.exportDone2'));
        return;
      }

      const snap = await canvasRef.current.makeImageSnapshotAsync();
      if (!snap) throw new Error(t('editor.errSnapshotFailed'));

      const encoded = snap.encodeToBase64(ImageFormat.PNG, 100);
      const file    = new File(Paths.cache, `mockup_${Date.now()}.png`);
      file.write(encoded, { encoding: 'base64' });

      if (target === 'photos') {
        await MediaLibrary.saveToLibraryAsync(file.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showAdThenAlert(t('editor.doneTitle'), t('editor.exportDonePhotos'));
      } else {
        await Sharing.shareAsync(file.uri, { mimeType: 'image/png' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showAdThenAlert(t('editor.doneTitle'), t('editor.exportDoneShared'));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(t('editor.errTitle'), `${t('editor.exportFailed')}\n${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveOptions = () => {
    Alert.alert(t('editor.exportTitle'), undefined, [
      { text: t('editor.exportSavePhotos'), onPress: () => exportTo('photos') },
      { text: t('editor.exportSaveFiles'),  onPress: () => exportTo('files') },
      { text: t('editor.exportCancel'), style: 'cancel' },
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
    // split canvas height is ~half of normal, so default y:-250 goes off-screen
    const textY = templateId === 'split' ? -80 : -250;
    addLayer({ ...layer, position: { x: 0, y: textY } });
    setTextInput('');
    setTextModalVisible(false);
    setActiveTool('select');
  };

  // ─── Media pick ────────────────────────────────────────────────────────────

  const pickImageForSlot = async (slot: 0 | 1) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (frameEnabled) {
        setCropPending({ uri: asset.uri, width: asset.width, height: asset.height, frameSlot: slot });
      } else {
        addLayer(createDefaultLayer('image', asset.uri, { width: asset.width, height: asset.height }));
      }
    }
  };

  const handleMediaPick = () => {
    if (templateId === 'double') {
      Alert.alert(t('editor.frameSelectTitle'), t('editor.frameSelectMsg'), [
        { text: t('editor.frameSelectLeft'),  onPress: () => pickImageForSlot(0) },
        { text: t('editor.frameSelectRight'), onPress: () => pickImageForSlot(1) },
        { text: t('editor.exportCancel'), style: 'cancel' },
      ]);
    } else {
      pickImageForSlot(0);
    }
  };

  const handleCropConfirm = (crop: { cropX: number; cropY: number; cropW: number; cropH: number }) => {
    if (!cropPending) return;
    const { frameSlot } = cropPending;
    // For double template, remove only the layer in the same slot
    if (templateId === 'double') {
      layers.filter((l) => l.type === 'image' && l.frameSlot === frameSlot).forEach((l) => removeLayer(l.id));
    } else {
      layers.filter((l) => l.type === 'image').forEach((l) => removeLayer(l.id));
    }
    const layer = createDefaultLayer('image', cropPending.uri, {
      width: cropPending.width,
      height: cropPending.height,
    });
    addLayer({ ...layer, ...crop, frameSlot });
    setCropPending(null);
  };

  const screenAspectRatio = frameScreenRect
    ? frameScreenRect.height / frameScreenRect.width
    : 2688 / 1242;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
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
        {activeTool === 'frame' && <FrameSizePanel />}
        {activeTool === 'frame' && templateId === 'split' && <SplitPositionPanel />}
        {activeTool === 'background' && <BackgroundPicker />}
        {activeTool === 'sticker'    && <StickerPicker />}
        {activeTool === 'layers'     && <LayerPanel />}
        {activeTool === 'text' && !selectedIsText && (
          <View className="bg-white border-t border-gray-200 px-4 py-3">
            <Text className="text-sm font-semibold text-gray-500 mb-3">{t('editor.textSectionTitle')}</Text>
            <TouchableOpacity onPress={openTextModal} className="bg-primary rounded-xl py-3 items-center">
              <Text className="text-white font-semibold">{t('editor.textAddBtn')}</Text>
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
              <Text className="text-lg font-bold text-gray-900">{t('editor.textModalTitle')}</Text>
              <TouchableOpacity onPress={() => setTextModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={textInput}
              onChangeText={setTextInput}
              placeholder={t('editor.textInputPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              className="bg-gray-100 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              autoFocus
              multiline
            />
            <TouchableOpacity onPress={handleAddText} className="bg-primary rounded-xl py-3 items-center">
              <Text className="text-white font-semibold">{t('editor.textAddConfirm')}</Text>
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
