import type { RefObject } from 'react';
import type { CanvasRef, SkImage } from '@shopify/react-native-skia';
import { FilterMode, ImageFormat, MipmapMode, Skia } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';

export function resizeSkiaImage(image: SkImage, width: number, height: number): SkImage {
  if (image.width() === width && image.height() === height) return image;

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) {
    throw new Error(`Failed to create export surface: ${width}x${height}`);
  }

  const canvas = surface.getCanvas();
  canvas.drawImageRectOptions(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(0, 0, width, height),
    FilterMode.Linear,
    MipmapMode.Linear
  );
  surface.flush();
  return surface.makeImageSnapshot();
}

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
