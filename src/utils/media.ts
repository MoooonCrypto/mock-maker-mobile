import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { File, Paths } from 'expo-file-system';

export interface PickedImageAsset {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
}

async function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

export async function normalizePickedImage(asset: ImagePicker.ImagePickerAsset): Promise<PickedImageAsset> {
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
    uri: normalizedUri,
    width,
    height,
    fileName: asset.fileName,
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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
