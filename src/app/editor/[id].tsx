import { useEffect, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { View, Text, TouchableOpacity, Alert, TextInput, Modal, ActivityIndicator, useWindowDimensions, KeyboardAvoidingView, Platform, PanResponder, PixelRatio } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ImageFormat } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { useEditorStore, createDefaultLayer } from '@/stores/useEditorStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { getPreset, getMaxFrameScale } from '@/constants/canvasPresets';
import { getLogicalCanvasSize } from '@/utils/canvasMetrics';
import { computeFrameScreenRects } from '@/utils/frameRects';
import { t } from '@/i18n';
import { Canvas } from '@/components/editor/Canvas';
import { GestureCanvas } from '@/components/editor/GestureCanvas';
import { Toolbar } from '@/components/editor/Toolbar';
import { BackgroundPicker } from '@/components/editor/BackgroundPicker';
import { LayerPanel } from '@/components/editor/LayerPanel';
import { TextEditPanel } from '@/components/editor/TextEditPanel';
import { StickerPicker } from '@/components/editor/StickerPicker';
import { MediaCropModal } from '@/components/editor/MediaCropModal';
import { CanvasPicker } from '@/components/editor/CanvasPicker';
import { VideoOverlay } from '@/components/editor/VideoOverlay';
import { FrameOverlay } from '@/components/editor/FrameOverlay';
import { colors } from '@/constants/theme';
import { pickImage, pickVideo } from '@/utils/media';
import { PRO_FALLBACK_PRICE_LABEL } from '@/config/purchases';
import { ProCard } from '@/components/ProCard';
import MobileAds, {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-2543814564794464/2351282112';

const MAX_VIDEO_DURATION_MS = 2 * 60 * 1000;

// ─── Shared slider hook ───────────────────────────────────────────────────────

function useSliderPanResponder(onChange: (ratio: number) => void, onEnd?: (ratio: number) => void) {
  const trackWRef = useRef(300);
  const viewPageXRef = useRef(0);
  const trackViewRef = useRef<any>(null);
  const ratioRef = useRef(0);

  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const r = Math.max(0, Math.min(1, (e.nativeEvent.pageX - viewPageXRef.current) / trackWRef.current));
      ratioRef.current = r;
      onChange(r);
    },
    onPanResponderMove: (e) => {
      const r = Math.max(0, Math.min(1, (e.nativeEvent.pageX - viewPageXRef.current) / trackWRef.current));
      ratioRef.current = r;
      onChange(r);
    },
    onPanResponderRelease: () => {
      onEnd?.(ratioRef.current);
    },
    onPanResponderTerminate: () => {
      onEnd?.(ratioRef.current);
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

function FrameSizePanel({
  frameScale,
  onPreviewChange,
  onCommit,
}: {
  frameScale: number;
  onPreviewChange: (scale: number) => void;
  onCommit: (scale: number) => void;
}) {
  const templateId = useEditorStore((s) => s.templateId);
  const canvasPresetId = useEditorStore((s) => s.canvasPresetId);
  const [trackW, setTrackW] = useState(300);
  const pixelRatio = PixelRatio.get();
  const { canvasWidth: canvasLogW, canvasHeight: canvasLogH } = getLogicalCanvasSize(canvasPresetId, templateId, pixelRatio);
  const minScale = 0.3;
  const maxScale = getMaxFrameScale(canvasLogW, canvasLogH, templateId);
  const scaleRange = Math.max(maxScale - minScale, 0.001);
  const [draftScale, setDraftScale] = useState(frameScale);

  useEffect(() => {
    setDraftScale(frameScale);
  }, [frameScale]);

  const { pr, trackViewRef, onLayout } = useSliderPanResponder(
    (r) => {
      const nextScale = minScale + r * scaleRange;
      setDraftScale(nextScale);
      onPreviewChange(nextScale);
    },
    (r) => {
      const nextScale = minScale + r * scaleRange;
      onCommit(nextScale);
    }
  );

  const pct = Math.max(0, Math.min(1, (draftScale - minScale) / scaleRange));

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderColor: '#e5e7eb' }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>
        {t('editor.frameSizeLabel', { pct: Math.round(Math.min(draftScale, maxScale) * 100) })}
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
    sessionName,
    setSessionName,
    layers,
    selectedLayerId,
    selectedFrameId,
    frameScale,
    framePosition,
    canvasRef,
    reset,
    templateId,
    background,
    canvasPresetId,
  } = useEditorStore();
  const saveProject = useProjectStore((s) => s.saveProject);
  const isPro = usePurchaseStore((s) => s.isPro);
  const projectId = id ?? Date.now().toString();

  const [canvasAreaH, setCanvasAreaH] = useState(0);

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
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [proPromptVisible, setProPromptVisible] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewFrameScale, setPreviewFrameScale] = useState<number | null>(null);

  const [cropPending, setCropPending] = useState<{
    type: 'image' | 'video'; uri: string; width: number; height: number; frameSlot?: 0 | 1; durationMs?: number;
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
    adLoadedRef.current = false;
    pendingAlertRef.current = null;
    interstitialRef.current = null;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

    if (isPro) {
      return;
    }

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
    }).catch(() => {
      adLoadedRef.current = false;
    });

    return () => {
      unsubLoad(); unsubError(); unsubClose();
      adLoadedRef.current = false;
      interstitialRef.current = null;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [isPro]);

  useEffect(() => {
    return () => reset();
  }, [id, reset]);

  useEffect(() => {
    if (previewFrameScale !== null && Math.abs(previewFrameScale - frameScale) < 0.0001) {
      setPreviewFrameScale(null);
    }
  }, [frameScale, previewFrameScale]);

  // ─── Export ────────────────────────────────────────────────────────────────

  const handleSaveOptions = () => {
    router.push(`/export/${projectId}`);
  };

  const openProjectSave = () => {
    if (!isPro) {
      setProPromptVisible(true);
      return;
    }

    setProjectNameInput(sessionName);
    setSaveModalVisible(true);
  };

  const buildProjectThumbnail = async (): Promise<string | undefined> => {
    if (!canvasRef?.current) return undefined;

    const snapshot = await canvasRef.current.makeImageSnapshotAsync();
    if (!snapshot) return undefined;

    const thumbnailFile = new File(Paths.cache, `project_thumb_${projectId}.png`);
    thumbnailFile.write(snapshot.encodeToBase64(ImageFormat.PNG, 100), { encoding: 'base64' });
    return thumbnailFile.uri;
  };

  const handleProjectSave = async () => {
    const trimmedName = projectNameInput.trim();
    if (!trimmedName) {
      Alert.alert(t('editor.errTitle'), t('editor.projectNameRequired'));
      return;
    }

    setBusy(true);
    try {
      const thumbnailUri = await buildProjectThumbnail();
      await saveProject({
        id: projectId,
        sessionName: trimmedName,
        templateId,
        layers,
        selectedFrameId,
        frameScale,
        framePosition,
        background,
        canvasPresetId,
        thumbnailUri,
      });
      setSessionName(trimmedName);
      setSaveModalVisible(false);
      Alert.alert(t('editor.doneTitle'), t('editor.projectSaved'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert(t('editor.errTitle'), `${t('editor.projectSaveFailed')}\n${msg}`);
    } finally {
      setBusy(false);
    }
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
    const textY = templateId === 'split' ? -100 : -300;
    addLayer({ ...layer, position: { x: 0, y: textY } });
    setTextInput('');
    setTextModalVisible(false);
    setActiveTool('select');
  };

  // ─── Media pick ────────────────────────────────────────────────────────────

  const freeTemplateImageOffset = (index: number) => {
    const offsets = [
      { x: 0, y: 0 },
      { x: 28, y: 28 },
      { x: -28, y: 28 },
      { x: 28, y: -28 },
      { x: -28, y: -28 },
    ];
    return offsets[index % offsets.length];
  };

  const clearFrameMediaLayers = (frameSlot?: 0 | 1) => {
    if (templateId === 'double') {
      layers
        .filter((layer) => (layer.type === 'image' || layer.type === 'video') && layer.frameSlot === frameSlot)
        .forEach((layer) => removeLayer(layer.id));
      return;
    }

    layers
      .filter((layer) => layer.type === 'image' || layer.type === 'video')
      .forEach((layer) => removeLayer(layer.id));
  };

  const pickImageForSlot = async (slot: 0 | 1) => {
    try {
      const asset = await pickImage();
      if (!asset) return;

      if (frameEnabled) {
        setCropPending({ type: 'image', uri: asset.uri, width: asset.width, height: asset.height, frameSlot: slot });
      } else {
        const layer = createDefaultLayer('image', asset.uri, { width: asset.width, height: asset.height });
        if (templateId === 'free') {
          const imageCount = layers.filter((existingLayer) => existingLayer.type === 'image' || existingLayer.type === 'video').length;
          const offset = freeTemplateImageOffset(imageCount);
          addLayer({ ...layer, position: offset });
        } else {
          addLayer(layer);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('editor.errTitle'), `画像の読み込みに失敗しました\n${msg}`);
    }
  };

  const pickVideoForSlot = async (slot: 0 | 1) => {
    try {
      if (templateId !== 'single' && templateId !== 'double') {
        Alert.alert(t('editor.errTitle'), t('editor.errVideoTemplateUnsupported'));
        return;
      }
      const asset = await pickVideo();
      if (!asset) return;
      if (asset.durationMs != null && asset.durationMs > MAX_VIDEO_DURATION_MS) {
        Alert.alert(t('editor.errTitle'), t('editor.errVideoTooLong'));
        return;
      }

      if (frameEnabled) {
        setCropPending({
          type: 'video',
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          durationMs: asset.durationMs,
          frameSlot: slot,
        });
        return;
      }

      const layer = createDefaultLayer('video', asset.uri, { width: asset.width, height: asset.height });
      const nextLayer = { ...layer, frameSlot: frameEnabled ? slot : undefined, durationMs: asset.durationMs };

      addLayer(nextLayer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('editor.errTitle'), `${t('editor.errVideoLoadFailed')}\n${msg}`);
    }
  };

  const selectSlotAndPick = (kind: 'image' | 'video') => {
    if (kind === 'video' && templateId !== 'single' && templateId !== 'double') {
      Alert.alert(
        t('editor.errTitle'),
        templateId === 'split' ? t('editor.errVideoSplitUnsupported') : t('editor.errVideoTemplateUnsupported')
      );
      return;
    }

    if (templateId === 'double') {
      Alert.alert(t('editor.frameSelectTitle'), t('editor.frameSelectMsg'), [
        { text: t('editor.frameSelectLeft'),  onPress: () => kind === 'image' ? pickImageForSlot(0) : pickVideoForSlot(0) },
        { text: t('editor.frameSelectRight'), onPress: () => kind === 'image' ? pickImageForSlot(1) : pickVideoForSlot(1) },
        { text: t('editor.exportCancel'), style: 'cancel' },
      ]);
      return;
    }

    if (kind === 'image') {
      pickImageForSlot(0);
      return;
    }
    pickVideoForSlot(0);
  };

  const handleMediaPick = () => {
    if (templateId === 'split') {
      selectSlotAndPick('image');
      return;
    }

    if (templateId !== 'single' && templateId !== 'double') {
      const actions = [
        { text: t('editor.mediaPickImage'), onPress: () => selectSlotAndPick('image') },
        { text: t('editor.exportCancel'), style: 'cancel' as const },
      ];

      Alert.alert(t('editor.mediaPickTitle'), t('editor.mediaPickMessage'), actions);
      return;
    }

    const actions = [
      { text: t('editor.mediaPickImage'), onPress: () => selectSlotAndPick('image') },
      { text: t('editor.mediaPickVideo'), onPress: () => selectSlotAndPick('video') },
      { text: t('editor.exportCancel'), style: 'cancel' as const },
    ];

    Alert.alert(t('editor.mediaPickTitle'), t('editor.mediaPickMessage'), actions);
  };

  const handleCropConfirm = (crop: { cropX: number; cropY: number; cropW: number; cropH: number }) => {
    if (!cropPending) return;
    const { frameSlot } = cropPending;
    clearFrameMediaLayers(frameSlot);
    const layer = createDefaultLayer(cropPending.type, cropPending.uri, {
      width: cropPending.width,
      height: cropPending.height,
    });
    addLayer({
      ...layer,
      ...crop,
      frameSlot,
      durationMs: cropPending.durationMs,
    });
    setCropPending(null);
  };

  const effectiveFrameScale = previewFrameScale ?? frameScale;

  const cropFrameRects = computeFrameScreenRects({
    templateId,
    selectedFrameId,
    frameScale: effectiveFrameScale,
    framePosition,
    canvasPresetId,
    pixelRatio: PixelRatio.get(),
  });
  const cropScreenRect = templateId === 'double' && cropPending?.frameSlot === 1
    ? cropFrameRects.secondary
    : cropFrameRects.primary;
  const screenAspectRatio = cropScreenRect
    ? cropScreenRect.height / cropScreenRect.width
    : getPreset(canvasPresetId).exportH / getPreset(canvasPresetId).exportW;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-base font-semibold text-gray-900 px-4" numberOfLines={1}>
          {sessionName}
        </Text>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={openProjectSave} disabled={busy} hitSlop={8}>
            <Ionicons
              name={isPro ? 'folder-open-outline' : 'folder-outline'}
              size={24}
              color={isPro ? colors.textSecondary : '#d97706'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSaveOptions} disabled={busy} hitSlop={8}>
            {busy
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="download-outline" size={26} color={colors.primary} />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas area */}
      <View style={{ flex: 1, backgroundColor: '#d1d5db' }} onLayout={(e) => setCanvasAreaH(e.nativeEvent.layout.height)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <GestureCanvas canvasAreaH={canvasAreaH} dragOffsetX={dragOffsetX} dragOffsetY={dragOffsetY} pinchScale={pinchScale} frameDragX={frameDragX} frameDragY={frameDragY} framePinchS={framePinchS} frameScaleOverride={effectiveFrameScale}>
            <>
              <Canvas dragOffsetX={dragOffsetX} dragOffsetY={dragOffsetY} pinchScale={pinchScale} frameDragX={frameDragX} frameDragY={frameDragY} framePinchS={framePinchS} frameScaleOverride={effectiveFrameScale} />
              <VideoOverlay frameScaleOverride={effectiveFrameScale} />
              <FrameOverlay frameScaleOverride={effectiveFrameScale} />
            </>
          </GestureCanvas>
        </View>
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
        {activeTool === 'frame' && (
          <FrameSizePanel
            frameScale={effectiveFrameScale}
            onPreviewChange={setPreviewFrameScale}
            onCommit={(nextScale) => {
              setPreviewFrameScale(nextScale);
              useEditorStore.getState().setFrameScale(nextScale);
            }}
          />
        )}
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
        {activeTool === 'canvas' && <CanvasPicker />}
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

      <Modal visible={saveModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-2xl px-5 pt-5 pb-10">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-gray-900">{t('editor.projectSaveTitle')}</Text>
                <TouchableOpacity onPress={() => setSaveModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text className="text-sm text-gray-500 mb-3">{t('editor.projectSaveBody')}</Text>
              <TextInput
                value={projectNameInput}
                onChangeText={setProjectNameInput}
                placeholder={t('editor.projectNamePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                className="bg-gray-100 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleProjectSave}
              />
              <TouchableOpacity
                onPress={handleProjectSave}
                disabled={busy}
                className="bg-primary rounded-xl py-3 items-center"
                style={{ opacity: busy ? 0.7 : 1 }}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-semibold">{t('editor.projectSaveConfirm')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={proPromptVisible} transparent animationType="fade">
        <View className="flex-1 justify-center px-6" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <View>
            <TouchableOpacity
              onPress={() => setProPromptVisible(false)}
              className="self-end mb-3 w-10 h-10 rounded-full bg-white items-center justify-center"
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <ProCard
              isPro={isPro}
              priceLabel={PRO_FALLBACK_PRICE_LABEL}
              primaryLabel={t('editor.proRequiredSettings')}
              onPrimaryPress={() => {
                setProPromptVisible(false);
                router.push('/settings');
              }}
              showRestore={false}
            />
            <TouchableOpacity
              onPress={() => setProPromptVisible(false)}
              className="mt-3 rounded-2xl py-3 items-center"
            >
              <Text className="text-sm font-semibold text-white">{t('editor.proRequiredCancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {cropPending && (
        <MediaCropModal
          visible={true}
          mediaType={cropPending.type}
          uri={cropPending.uri}
          sourceWidth={cropPending.width}
          sourceHeight={cropPending.height}
          screenAspectRatio={screenAspectRatio}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropPending(null)}
        />
      )}
    </SafeAreaView>
  );
}
