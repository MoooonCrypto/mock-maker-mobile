import type { RefObject } from 'react';
import type { CanvasRef } from '@shopify/react-native-skia';
import { ImageFormat } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';

export async function captureCanvasSnapshot(
  canvasRef: RefObject<CanvasRef | null>,
  format: 'png' | 'jpg' = 'png',
  quality: number = 100,
): Promise<string | null> {
  if (!canvasRef.current) return null;

  try {
    const image = await canvasRef.current.makeImageSnapshotAsync();
    if (!image) return null;

    const fmt = format === 'png' ? ImageFormat.PNG : ImageFormat.JPEG;
    const encoded = image.encodeToBase64(fmt, quality);

    const filename = `mockup_${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`;
    const file = new File(Paths.cache, filename);
    file.write(encoded, { encoding: 'base64' });
    return file.uri;
  } catch (e) {
    console.error('Canvas snapshot error:', e);
    return null;
  }
}
