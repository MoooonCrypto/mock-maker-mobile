import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { ImageFormat } from '@shopify/react-native-skia';
import { useEditorStore } from '@/stores/useEditorStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { colors } from '@/constants/theme';
import { ExportSettings } from '@/types';

export default function ExportScreen() {
  const router = useRouter();
  const defaultExport = useSettingsStore((s) => s.defaultExport);
  const canvasRef = useEditorStore((s) => s.canvasRef);

  const [format,  setFormat]  = useState<ExportSettings['format']>(defaultExport.format);
  const [quality, setQuality] = useState<ExportSettings['quality']>(defaultExport.quality);
  const [busy, setBusy] = useState(false);

  const qualityValue = quality === 'high' ? 100 : 80;

  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'フォトライブラリへのアクセスを許可してください');
      return false;
    }
    return true;
  };

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
      const ext  = format === 'png' ? 'png' : 'jpg';
      const file = new File(Paths.cache, `mockup_${Date.now()}.${ext}`);
      file.write(encoded, { encoding: 'base64' });
      return file.uri;
    } catch (e) {
      console.error('Snapshot error:', e);
      return null;
    }
  };

  const handleSaveToPhotos = async () => {
    setBusy(true);
    try {
      if (!(await requestLibraryPermission())) return;
      const uri = await captureSnapshot();
      if (!uri) { Alert.alert('エラー', 'スナップショットの作成に失敗しました'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('完了', '写真アプリに保存しました 📸');
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('エラー', 'シェア機能が利用できません');
        return;
      }
      const uri = await captureSnapshot();
      if (!uri) { Alert.alert('エラー', 'スナップショットの作成に失敗しました'); return; }
      await Sharing.shareAsync(uri, { mimeType: format === 'png' ? 'image/png' : 'image/jpeg' });
    } catch {
      Alert.alert('エラー', 'シェアに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-primary">キャンセル</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">書き出し</Text>
        <View className="w-16" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <View className="bg-white rounded-2xl mb-4 overflow-hidden">
          <View className="px-4 pt-4 pb-2">
            <Text className="text-sm font-bold text-gray-700 mb-3">📷 画像として書き出し</Text>
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
            onPress={handleSaveToPhotos}
            disabled={busy}
            className={`mx-4 mb-2 rounded-xl py-3.5 flex-row items-center justify-center bg-primary ${busy ? 'opacity-60' : ''}`}
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="image-outline" size={18} color="#fff" />}
            <Text className="text-white font-semibold ml-2">写真アプリに保存</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            disabled={busy}
            className={`mx-4 mb-4 rounded-xl py-3.5 flex-row items-center justify-center border border-gray-200 ${busy ? 'opacity-60' : ''}`}
          >
            <Ionicons name="share-outline" size={18} color={colors.text} />
            <Text className="text-gray-900 font-semibold ml-2">共有 / ファイルに保存</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
