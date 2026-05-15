import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'react-native';
import { File, Paths } from 'expo-file-system';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function cleanupStaleCacheFiles(prefixes: string[], maxAgeMs: number) {
  try {
    const now = Date.now();
    for (const entry of Paths.cache.list()) {
      if (!(entry instanceof File)) continue;
      if (!prefixes.some((prefix) => entry.name.startsWith(prefix))) continue;
      const info = entry.info();
      const modifiedAt = info.modificationTime ?? info.creationTime ?? now;
      if (now - modifiedAt > maxAgeMs) {
        entry.delete();
      }
    }
  } catch {
    // Ignore cache cleanup failures.
  }
}

export interface PickedImageAsset {
  type: 'image';
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
}

export interface PickedVideoAsset {
  type: 'video';
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  durationMs?: number;
}

export type PickedMediaAsset = PickedImageAsset | PickedVideoAsset;

async function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

export async function normalizePickedImage(asset: ImagePicker.ImagePickerAsset): Promise<PickedImageAsset> {
  cleanupStaleCacheFiles(['picked_'], ONE_DAY_MS);
  const filename = `picked_${Date.now()}.jpg`;
  let normalizedUri = asset.uri;

  // expo-image-picker returns JPEG base64 data, which avoids ph:// / HEIC incompatibilities.
  if (asset.base64) {
    const file = new File(Paths.cache, filename);
    file.write(asset.base64, { encoding: 'base64' });
    normalizedUri = file.uri;
  }

  let width = asset.width;
  let height = asset.height;

  if (width <= 0 || height <= 0) {
    const size = await getImageSize(normalizedUri);
    width = size.width;
    height = size.height;
  }

  return {
    type: 'image',
    uri: normalizedUri,
    width,
    height,
    fileName: asset.fileName,
  };
}

async function resolveVideoUri(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (!asset.uri.startsWith('ph://')) return asset.uri;
  if (!asset.assetId) return asset.uri;

  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
    return info.localUri ?? asset.uri;
  } catch {
    return asset.uri;
  }
}

export async function normalizePickedVideo(asset: ImagePicker.ImagePickerAsset): Promise<PickedVideoAsset> {
  const normalizedUri = await resolveVideoUri(asset);

  return {
    type: 'video',
    uri: normalizedUri,
    width: Math.max(asset.width || 1, 1),
    height: Math.max(asset.height || 1, 1),
    fileName: asset.fileName,
    durationMs: asset.duration ?? undefined,
  };
}

export async function pickImage(): Promise<PickedImageAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    base64: true,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled || !result.assets[0]) return null;
  return await normalizePickedImage(result.assets[0]);
}

export async function pickVideo(): Promise<PickedVideoAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  return await normalizePickedVideo(result.assets[0]);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
