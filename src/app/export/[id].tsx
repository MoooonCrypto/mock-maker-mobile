import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, PixelRatio, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageFormat } from '@shopify/react-native-skia';
import { useEditorStore } from '@/stores/useEditorStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { colors } from '@/constants/theme';
import { getPreset } from '@/constants/canvasPresets';
import { type ExportSettings } from '@/types';
import { resizeSkiaImage } from '@/services/compositing';
import { composeVideoMockup } from '@/services/videoCompositing';
import type { FrameOverlayInput } from '../../../modules/video-compositor/src';
import { buildMediaScene } from '@/utils/mediaScene';
import { getLogicalCanvasSize } from '@/utils/canvasMetrics';
import { computeFramePresentation } from '@/utils/frameRects';
import { t } from '@/i18n';

const FRAME_IMAGE_IPHONE_OVERLAY = require('../../../assets/frame_1_ver4.png');

function waitForCanvasRefresh(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

const EXPORT_CACHE_PREFIXES = ['mockup_', 'mockup_video_', 'mockup_video_bg_', 'mockup_bg_'];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function cleanupFiles(uris: string[]) {
  for (const uri of uris) {
    try {
      new File(uri).delete();
    } catch {
      // Ignore temp file cleanup failures.
    }
  }
}

function cleanupStaleExportCache() {
  try {
    const now = Date.now();
    for (const entry of new Directory(Paths.cache).list()) {
      if (!(entry instanceof File)) continue;
      if (!EXPORT_CACHE_PREFIXES.some((prefix) => entry.name.startsWith(prefix))) continue;
      const info = entry.info();
      const modifiedAt = info.modificationTime ?? info.creationTime ?? now;
      if (now - modifiedAt > ONE_DAY_MS) {
        entry.delete();
      }
    }
  } catch {
    // Ignore cache sweep failures.
  }
}

async function withCleanCanvas<T>(task: () => Promise<T>): Promise<T> {
  const state = useEditorStore.getState();
  const prevSelectedLayerId = state.selectedLayerId;
  const prevActiveTool = state.activeTool;

  if (prevSelectedLayerId !== null) state.selectLayer(null);
  if (prevActiveTool !== 'select') state.setActiveTool('select');

  await waitForCanvasRefresh();

  try {
    return await task();
  } finally {
    state.selectLayer(prevSelectedLayerId);
    state.setActiveTool(prevActiveTool);
  }
}

export default function ExportScreen() {
  const router = useRouter();
  const defaultExport = useSettingsStore((s) => s.defaultExport);
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const canvasPresetId = useEditorStore((s) => s.canvasPresetId);
  const templateId = useEditorStore((s) => s.templateId);
  const layers = useEditorStore((s) => s.layers);
  const selectedFrameId = useEditorStore((s) => s.selectedFrameId);
  const frameScale = useEditorStore((s) => s.frameScale);
  const framePosition = useEditorStore((s) => s.framePosition);

  const [format, setFormat] = useState<ExportSettings['format']>(defaultExport.format);
  const [quality, setQuality] = useState<ExportSettings['quality']>(defaultExport.quality);
  const [busy, setBusy] = useState(false);

  const hasVideoLayers = useMemo(
    () => layers.some((layer) => layer.type === 'video'),
    [layers]
  );
  const videoLayers = useMemo(
    () => layers.filter((layer) => layer.type === 'video'),
    [layers]
  );

  const qualityValue = quality === 'high' ? 100 : 80;

  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('editor.errPermissionTitle'), t('editor.errPermission'));
      return false;
    }
    return true;
  };

  const captureImageFiles = async (): Promise<string[]> => {
    if (!canvasRef?.current) {
      throw new Error(t('editor.errCanvasNotFound'));
    }

    cleanupStaleExportCache();
    const pixelRatio = PixelRatio.get();
    const preset = getPreset(canvasPresetId);
    const { canvasWidth: canvasLogW, canvasHeight: canvasLogH } = getLogicalCanvasSize(canvasPresetId, templateId, pixelRatio);
    return await withCleanCanvas(async () => {
      if (templateId === 'split') {
        const halfW = canvasLogW / 2;
        const bounds = [
          { x: 0, y: 0, width: halfW, height: canvasLogH },
          { x: halfW, y: 0, width: halfW, height: canvasLogH },
        ];

        const files: string[] = [];
        const ts = Date.now();
        for (let i = 0; i < bounds.length; i++) {
          const snap = await canvasRef.current!.makeImageSnapshotAsync(bounds[i]);
          if (!snap) throw new Error(`${t('editor.errSnapshotFailed')} (${i + 1})`);
          const resized = resizeSkiaImage(snap, preset.exportW, preset.exportH);
          const encoded = format === 'png'
            ? resized.encodeToBase64(ImageFormat.PNG, qualityValue)
            : resized.encodeToBase64(ImageFormat.JPEG, qualityValue);
          const ext = format === 'png' ? 'png' : 'jpg';
          const file = new File(Paths.cache, `mockup_${ts}_${i + 1}.${ext}`);
          file.write(encoded, { encoding: 'base64' });
          files.push(file.uri);
        }
        return files;
      }

      const snap = await canvasRef.current!.makeImageSnapshotAsync();
      if (!snap) throw new Error(t('editor.errSnapshotFailed'));
      const resized = resizeSkiaImage(snap, preset.exportW, preset.exportH);
      const encoded = format === 'png'
        ? resized.encodeToBase64(ImageFormat.PNG, qualityValue)
        : resized.encodeToBase64(ImageFormat.JPEG, qualityValue);
      const ext = format === 'png' ? 'png' : 'jpg';
      const file = new File(Paths.cache, `mockup_${Date.now()}.${ext}`);
      file.write(encoded, { encoding: 'base64' });
      return [file.uri];
    });
  };

  const captureVideoFile = async (): Promise<{ uri: string; cleanupUris: string[] }> => {
    if (!canvasRef?.current) {
      throw new Error(t('editor.errCanvasNotFound'));
    }
    if (videoLayers.length === 0) {
      throw new Error(t('editor.errVideoExportMissing'));
    }
    if (templateId !== 'single' && templateId !== 'double') {
      throw new Error(templateId === 'split' ? t('editor.errVideoSplitUnsupported') : t('editor.errVideoTemplateUnsupported'));
    }

    cleanupStaleExportCache();
    const pixelRatio = PixelRatio.get();
    const preset = getPreset(canvasPresetId);
    const { canvasWidth: canvasLogW, canvasHeight: canvasLogH } = getLogicalCanvasSize(canvasPresetId, templateId, pixelRatio);
    const mediaScene = buildMediaScene({
      layers,
      templateId,
      selectedFrameId,
      frameScale,
      framePosition,
      canvasPresetId,
      pixelRatio,
      canvasWidth: canvasLogW,
      canvasHeight: canvasLogH,
    });

    return await withCleanCanvas(async () => {
      const snap = await canvasRef.current!.makeImageSnapshotAsync();
      if (!snap) throw new Error(t('editor.errSnapshotFailed'));

      const resized = resizeSkiaImage(snap, preset.exportW, preset.exportH);
      const backgroundFile = new File(Paths.cache, `mockup_video_bg_${Date.now()}.png`);
      backgroundFile.write(resized.encodeToBase64(ImageFormat.PNG, 100), { encoding: 'base64' });

      const scaleX = preset.exportW / canvasLogW;
      const scaleY = preset.exportH / canvasLogH;
      const framePresentation = computeFramePresentation({
        templateId,
        selectedFrameId,
        frameScale,
        framePosition,
        canvasPresetId,
        pixelRatio,
      });
      const frameImageUri = RNImage.resolveAssetSource(FRAME_IMAGE_IPHONE_OVERLAY).uri;
      const overlays = mediaScene.filter((item) => item.layer.type === 'video').map((item) => {
        return {
          uri: item.layer.uri,
          x: item.targetRect.x * scaleX,
          y: item.targetRect.y * scaleY,
          width: item.targetRect.width * scaleX,
          height: item.targetRect.height * scaleY,
          drawX: item.drawRect.x * scaleX,
          drawY: item.drawRect.y * scaleY,
          drawWidth: item.drawRect.width * scaleX,
          drawHeight: item.drawRect.height * scaleY,
          cornerRadius: item.cornerRadius * scaleX,
          zIndex: item.layer.zIndex,
          order: item.order,
          cropXRatio: item.sourceCropRatios.cropXRatio,
          cropYRatio: item.sourceCropRatios.cropYRatio,
          cropWRatio: item.sourceCropRatios.cropWRatio,
          cropHRatio: item.sourceCropRatios.cropHRatio,
        };
      });
      const primaryOverlayFrame = framePresentation.primaryOverlayFrame;
      const secondaryOverlayFrame = framePresentation.secondaryOverlayFrame;
      const frameOverlays: FrameOverlayInput[] = selectedFrameId === 'iphone'
        ? [
            primaryOverlayFrame && {
              uri: frameImageUri,
              x: primaryOverlayFrame.x * scaleX,
              y: primaryOverlayFrame.y * scaleY,
              width: primaryOverlayFrame.width * scaleX,
              height: primaryOverlayFrame.height * scaleY,
            },
            templateId === 'double' && secondaryOverlayFrame && {
              uri: frameImageUri,
              x: secondaryOverlayFrame.x * scaleX,
              y: secondaryOverlayFrame.y * scaleY,
              width: secondaryOverlayFrame.width * scaleX,
              height: secondaryOverlayFrame.height * scaleY,
            },
          ].filter((overlay): overlay is FrameOverlayInput => Boolean(overlay))
        : [];

      const uri = await composeVideoMockup(backgroundFile.uri, overlays, frameOverlays);
      return { uri, cleanupUris: [backgroundFile.uri, uri] };
    });
  };

  const handleSaveImageToPhotos = async () => {
    setBusy(true);
    let files: string[] = [];
    try {
      if (!(await requestLibraryPermission())) return;
      files = await captureImageFiles();
      for (const uri of files) {
        await MediaLibrary.saveToLibraryAsync(uri);
      }
      Alert.alert(t('editor.doneTitle'), files.length > 1 ? t('editor.exportDone2') : t('editor.exportDonePhotos'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert(t('editor.errTitle'), `${t('editor.exportFailed')}\n${msg}`);
    } finally {
      cleanupFiles(files);
      setBusy(false);
    }
  };

  const handleShareImage = async () => {
    setBusy(true);
    let files: string[] = [];
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('editor.errTitle'), 'シェア機能が利用できません');
        return;
      }
      files = await captureImageFiles();
      for (const uri of files) {
        await Sharing.shareAsync(uri, { mimeType: format === 'png' ? 'image/png' : 'image/jpeg' });
      }
      Alert.alert(t('editor.doneTitle'), t('editor.exportDoneShared'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert(t('editor.errTitle'), `${t('editor.exportFailed')}\n${msg}`);
    } finally {
      cleanupFiles(files);
      setBusy(false);
    }
  };

  const handleSaveVideoToPhotos = async () => {
    setBusy(true);
    let cleanupUris: string[] = [];
    try {
      if (!(await requestLibraryPermission())) return;
      const result = await captureVideoFile();
      cleanupUris = result.cleanupUris;
      const uri = result.uri;
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('editor.doneTitle'), t('editor.exportDoneVideoPhotos'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert(t('editor.errTitle'), `${t('editor.exportVideoFailed')}\n${msg}`);
    } finally {
      cleanupFiles(cleanupUris);
      setBusy(false);
    }
  };

  const handleShareVideo = async () => {
    setBusy(true);
    let cleanupUris: string[] = [];
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('editor.errTitle'), 'シェア機能が利用できません');
        return;
      }
      const result = await captureVideoFile();
      cleanupUris = result.cleanupUris;
      const uri = result.uri;
      await Sharing.shareAsync(uri, { mimeType: 'video/mp4' });
      Alert.alert(t('editor.doneTitle'), t('editor.exportDoneVideoShared'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert(t('editor.errTitle'), `${t('editor.exportVideoFailed')}\n${msg}`);
    } finally {
      cleanupFiles(cleanupUris);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-primary">{t('editor.exportCancel')}</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">{t('editor.exportTitle')}</Text>
        <View className="w-16" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {!hasVideoLayers && (
          <View className="bg-white rounded-2xl mb-4 overflow-hidden">
            <View className="px-4 pt-4 pb-2">
              <Text className="text-sm font-bold text-gray-700 mb-3">{t('editor.exportImageTitle')}</Text>
              <Text className="text-xs text-gray-500 mb-1">フォーマット</Text>
              <View className="flex-row bg-gray-100 rounded-lg overflow-hidden mb-3">
                {(['png', 'jpg'] as const).map((fmt) => (
                  <TouchableOpacity
                    key={fmt}
                    onPress={() => setFormat(fmt)}
                    disabled={busy}
                    className={`flex-1 py-2.5 items-center ${format === fmt ? 'bg-primary' : ''}`}
                  >
                    <Text className={`font-semibold text-sm ${format === fmt ? 'text-white' : 'text-gray-600'}`}>
                      {fmt.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-xs text-gray-500 mb-1">画質</Text>
              <View className="flex-row bg-gray-100 rounded-lg overflow-hidden mb-4">
                {([{ key: 'standard' as const, label: '標準' }, { key: 'high' as const, label: '高画質' }]).map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setQuality(key)}
                    disabled={busy}
                    className={`flex-1 py-2.5 items-center ${quality === key ? 'bg-primary' : ''}`}
                  >
                    <Text className={`font-semibold text-sm ${quality === key ? 'text-white' : 'text-gray-600'}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSaveImageToPhotos}
              disabled={busy}
              className={`mx-4 mb-2 rounded-xl py-3.5 flex-row items-center justify-center bg-primary ${busy ? 'opacity-60' : ''}`}
            >
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="image-outline" size={18} color="#fff" />}
              <Text className="text-white font-semibold ml-2">{t('editor.exportSavePhotos')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShareImage}
              disabled={busy}
              className={`mx-4 mb-4 rounded-xl py-3.5 flex-row items-center justify-center border border-gray-200 ${busy ? 'opacity-60' : ''}`}
            >
              <Ionicons name="share-outline" size={18} color={colors.text} />
              <Text className="text-gray-900 font-semibold ml-2">{t('editor.exportSaveFiles')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasVideoLayers && (
          <View className="bg-white rounded-2xl mb-4 overflow-hidden">
            <View className="px-4 pt-4 pb-4">
              <Text className="text-sm font-bold text-gray-700 mb-2">{t('editor.exportVideoTitle')}</Text>
              <Text className="text-xs text-gray-500">
                {templateId === 'split'
                  ? t('editor.errVideoSplitUnsupported')
                  : '動画レイヤーを含むため、MP4として書き出します。静止画像レイヤーや背景は動画フレームに合成されます。'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveVideoToPhotos}
              disabled={busy || templateId === 'split'}
              className={`mx-4 mb-2 rounded-xl py-3.5 flex-row items-center justify-center bg-primary ${busy ? 'opacity-60' : ''}`}
            >
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="videocam-outline" size={18} color="#fff" />}
              <Text className="text-white font-semibold ml-2">{t('editor.exportSaveVideoPhotos')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShareVideo}
              disabled={busy || templateId === 'split'}
              className={`mx-4 mb-4 rounded-xl py-3.5 flex-row items-center justify-center border border-gray-200 ${busy ? 'opacity-60' : ''}`}
            >
              <Ionicons name="share-outline" size={18} color={colors.text} />
              <Text className="text-gray-900 font-semibold ml-2">{t('editor.exportSaveVideoFiles')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
