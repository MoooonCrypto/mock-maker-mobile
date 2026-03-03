/**
 * Video compositing service — wraps the local VideoCompositor Expo Module.
 *
 * The native module (AVFoundation) composites:
 *   1. Skia canvas snapshot PNG  → device frame background (with black screen area)
 *   2. Source video              → scaled and placed at the device screen rect
 *   → Output: MP4 file
 *
 * Coordinate note:
 *   screenRect from getFrameLayout() is in display points.
 *   Multiply by PixelRatio.get() before passing to the native module,
 *   because the Skia snapshot is in device pixels.
 */

import { PixelRatio } from 'react-native';
import { composeVideo as nativeCompose } from 'video-compositor';
import { Paths } from 'expo-file-system';

export interface VideoComposeOptions {
  /** file:// URI of the Skia PNG snapshot */
  bgImageUri: string;
  /** file:// URI of the source video (from expo-image-picker) */
  videoUri: string;
  /** Screen rect in DISPLAY POINTS (getFrameLayout output) */
  screenRect: { x: number; y: number; width: number; height: number };
}

/**
 * Compose video with device frame background.
 * Returns a file:// URI of the output MP4, or throws on failure.
 */
export async function composeVideoWithFrame(
  options: VideoComposeOptions,
): Promise<string> {
  const { bgImageUri, videoUri, screenRect } = options;
  const ratio = PixelRatio.get();

  // Output path in cache (bare path, no file:// — native module adds it)
  const outputPath = `${Paths.cache}/mockup_video_${Date.now()}.mp4`;

  return await nativeCompose({
    backgroundImagePath: bgImageUri,
    videoPath: videoUri,
    screenRectX:      screenRect.x      * ratio,
    screenRectY:      screenRect.y      * ratio,
    screenRectWidth:  screenRect.width  * ratio,
    screenRectHeight: screenRect.height * ratio,
    outputPath,
  });
}

export function isVideoExportSupported(): boolean {
  return true; // Native module is always available in Dev Client build
}
