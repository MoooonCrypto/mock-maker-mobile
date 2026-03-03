import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, PixelRatio, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { ImageFormat } from '@shopify/react-native-skia';
import { useEditorStore } from '@/stores/useEditorStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { getFrameLayout } from '@/components/editor/Canvas';
import { composeVideoWithFrame } from '@/services/videoCompositing';
import { colors } from '@/constants/theme';
import { ExportSettings } from '@/types';

export default function ExportScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const defaultExport = useSettingsStore((s) => s.defaultExport);
  const canvasRef   = useEditorStore((s) => s.canvasRef);
  const layers      = useEditorStore((s) => s.layers);
  const deviceFrame = useEditorStore((s) => s.deviceFrame);

  const [format,  setFormat]  = useState<ExportSettings['format']>(defaultExport.format);
  const [quality, setQuality] = useState<ExportSettings['quality']>(defaultExport.quality);
  const [imageSaved,   setImageSaved]   = useState(false);
  const [imageExporting, setImageExporting] = useState(false);
  const [videoExporting, setVideoExporting] = useState(false);

  const qualityValue  = quality === 'high' ? 100 : 80;
  const hasVideoLayer = layers.some((l) => l.type === 'video');
  const videoLayer    = layers.find((l) => l.type === 'video');

  const estimatedSize = useMemo(() => {
    const base       = format === 'png' ? 2.4 : 1.2;
    const multiplier = quality === 'high' ? 1 : 0.6;
    return (base * multiplier).toFixed(1);
  }, [format, quality]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'フォトライブラリへのアクセスを許可してください');
      return false;
    }
    return true;
  };

  /** Capture Skia canvas → cache file. Returns file:// URI or null. */
  const captureSnapshot = async (): Promise<string | null> => {
    if (!canvasRef?.current) {
      Alert.alert('エラー', 'キャンバスが見つかりません。エディターに戻ってください。');
      return null;
    }
    try {
      const image = await canvasRef.current.makeImageSnapshotAsync();
      if (!image) return null;

      const encoded = format === 'png'
        ? image.encodeToBase64(ImageFormat.PNG,  qualityValue)
        : image.encodeToBase64(ImageFormat.JPEG, qualityValue);

      const ext      = format === 'png' ? 'png' : 'jpg';
      const file     = new File(Paths.cache, `mockup_${Date.now()}.${ext}`);
      file.write(encoded, { encoding: 'base64' });
      return file.uri;
    } catch (e) {
      console.error('Snapshot error:', e);
      return null;
    }
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveImage = async () => {
    setImageExporting(true);
    try {
      if (!(await requestLibraryPermission())) return;

      const uri = await captureSnapshot();
      if (!uri) { Alert.alert('エラー', 'スナップショットの作成に失敗しました'); return; }

      await MediaLibrary.saveToLibraryAsync(uri);
      setImageSaved(true);
      setTimeout(() => setImageSaved(false), 2000);
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setImageExporting(false);
    }
  };

  const handleShare = async () => {
    setImageExporting(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('エラー', 'シェア機能が利用できません');
        return;
      }
      const uri = await captureSnapshot();
      if (!uri) { Alert.alert('エラー', 'スナップショットの作成に失敗しました'); return; }

      await Sharing.shareAsync(uri, {
        mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
      });
    } catch {
      Alert.alert('エラー', 'シェアに失敗しました');
    } finally {
      setImageExporting(false);
    }
  };

  const handleVideoExport = async () => {
    if (!videoLayer) return;
    setVideoExporting(true);
    try {
      if (!(await requestLibraryPermission())) return;

      // 1. Capture frame background (Skia: bezel + bg, black hole at screen area)
      if (!canvasRef?.current) {
        Alert.alert('エラー', 'キャンバスが見つかりません。エディターに戻ってください。');
        return;
      }
      const snap = await canvasRef.current.makeImageSnapshotAsync();
      if (!snap) { Alert.alert('エラー', 'スナップショットの作成に失敗しました'); return; }

      const bgEncoded = snap.encodeToBase64(ImageFormat.PNG, 100);
      const bgFile    = new File(Paths.cache, `frame_bg_${Date.now()}.png`);
      bgFile.write(bgEncoded, { encoding: 'base64' });

      // 2. Compute screen rect in display points
      const canvasWidth  = screenWidth;
      const canvasHeight = screenWidth * 1.5;
      let screenRect = { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
      if (deviceFrame) {
        const layout = getFrameLayout(deviceFrame, canvasWidth, canvasHeight);
        screenRect = layout.screenRect;
      }

      // 3. Compose with AVFoundation (native module converts points → pixels internally)
      const outputUri = await composeVideoWithFrame({
        bgImageUri: bgFile.uri,
        videoUri:   videoLayer.uri,
        screenRect,
      });

      // 4. Save to photo library
      await MediaLibrary.saveToLibraryAsync(outputUri);
      Alert.alert('完了', '動画をライブラリに保存しました 🎬');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Video export error:', msg);
      Alert.alert('エラー', `動画書き出しに失敗しました\n${msg}`);
    } finally {
      setVideoExporting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const busy = imageExporting || videoExporting;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-primary">キャンセル</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">書き出し</Text>
        <View className="w-16" />
      </View>

      <View className="mx-5 mt-6">
        {/* Format */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-sm font-semibold text-gray-500 mb-3">フォーマット（画像）</Text>
          <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
            {(['png', 'jpg'] as const).map((fmt) => (
              <TouchableOpacity
                key={fmt}
                onPress={() => setFormat(fmt)}
                className={`flex-1 py-3 items-center ${format === fmt ? 'bg-primary' : ''}`}
              >
                <Text className={`font-medium ${format === fmt ? 'text-white' : 'text-gray-600'}`}>
                  {fmt.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quality */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-sm font-semibold text-gray-500 mb-3">画質</Text>
          <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
            {([
              { key: 'standard' as const, label: '標準' },
              { key: 'high'     as const, label: '高画質' },
            ]).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setQuality(key)}
                className={`flex-1 py-3 items-center ${quality === key ? 'bg-primary' : ''}`}
              >
                <Text className={`font-medium ${quality === key ? 'text-white' : 'text-gray-600'}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* File info */}
        <View className="bg-white rounded-xl p-4 mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500">推定ファイルサイズ</Text>
            <Text className="text-gray-900 font-medium">{estimatedSize} MB</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-500">フォーマット</Text>
            <Text className="text-gray-900 font-medium">{format.toUpperCase()}</Text>
          </View>
        </View>

        {/* ── 画像書き出し ── */}
        <TouchableOpacity
          onPress={handleSaveImage}
          activeOpacity={0.8}
          disabled={busy}
          className={`rounded-xl py-4 flex-row items-center justify-center mb-3 ${
            imageSaved ? 'bg-green-500' : 'bg-primary'
          } ${busy ? 'opacity-60' : ''}`}
        >
          {imageExporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons
              name={imageSaved ? 'checkmark-circle' : 'download-outline'}
              size={20}
              color="#fff"
            />
          )}
          <Text className="text-white font-semibold text-base ml-2">
            {imageSaved
              ? 'ライブラリに保存済み'
              : imageExporting
              ? '書き出し中...'
              : 'ライブラリに保存（画像）'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.8}
          disabled={busy}
          className={`bg-white border border-gray-200 rounded-xl py-4 flex-row items-center justify-center mb-3 ${
            busy ? 'opacity-60' : ''
          }`}
        >
          <Ionicons name="share-outline" size={20} color={colors.text} />
          <Text className="text-gray-900 font-semibold text-base ml-2">共有する</Text>
        </TouchableOpacity>

        {/* ── 動画書き出し（動画レイヤーがある場合のみ表示） ── */}
        {hasVideoLayer && (
          <TouchableOpacity
            onPress={handleVideoExport}
            activeOpacity={0.8}
            disabled={busy}
            className={`bg-purple-600 rounded-xl py-4 flex-row items-center justify-center ${
              busy ? 'opacity-60' : ''
            }`}
          >
            {videoExporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="videocam-outline" size={20} color="#fff" />
            )}
            <Text className="text-white font-semibold text-base ml-2">
              {videoExporting ? '動画合成中...' : 'ライブラリに保存（MP4）'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
