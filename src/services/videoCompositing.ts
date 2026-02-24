/**
 * Video compositing service using ffmpeg-kit-react-native.
 *
 * Requires newArchEnabled: false in app.json (Old Architecture / Paper renderer).
 *
 * Compositing flow:
 * 1. Skia canvas snapshot → frame_bg.png (background + device bezel, black screen area)
 * 2. ffmpeg: scale video to screenRect dimensions, overlay at screenRect position
 * 3. Output .mp4 to cache directory
 */

import { PixelRatio } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FFmpegKit, ReturnCode } = require('ffmpeg-kit-react-native');

export interface VideoComposeOptions {
  /** Path to the Skia canvas snapshot PNG (frame background without video) */
  bgImageUri: string;
  /** URI of the source video file */
  videoUri: string;
  /** Screen rect in DISPLAY POINTS (will be scaled to pixels internally) */
  screenRect: { x: number; y: number; width: number; height: number };
}

/**
 * Compose a video with the device frame background using ffmpeg.
 * Returns the output .mp4 file URI, or null on failure.
 */
export async function composeVideoWithFrame(
  options: VideoComposeOptions,
): Promise<string | null> {
  const { bgImageUri, videoUri, screenRect } = options;

  // Convert display points to pixels to match Skia snapshot resolution
  const ratio = PixelRatio.get();
  const x = Math.round(screenRect.x * ratio);
  const y = Math.round(screenRect.y * ratio);
  const w = Math.round(screenRect.width * ratio);
  const h = Math.round(screenRect.height * ratio);

  const outputUri = bgImageUri.replace(/\/[^/]+$/, `/mockup_video_${Date.now()}.mp4`);

  // ffmpeg command:
  //  -loop 1 -i bg.png       — loop the background image as video
  //  -i video.mp4             — source video
  //  -filter_complex          — scale video to screen rect, overlay at position
  //  -map [out] -map 1:a?     — output video + optional audio
  //  -c:v libx264 -preset fast -pix_fmt yuv420p — H.264 encoding
  //  -shortest -movflags faststart — end when shortest stream ends
  const cmd = [
    `-loop 1 -i "${bgImageUri}"`,
    `-i "${videoUri}"`,
    `-filter_complex "[1:v]scale=${w}:${h}[vid];[0:v][vid]overlay=${x}:${y}:shortest=1[out]"`,
    `-map "[out]" -map 1:a?`,
    `-c:v libx264 -preset fast -pix_fmt yuv420p`,
    `-shortest -movflags faststart`,
    `-y "${outputUri}"`,
  ].join(' ');

  try {
    const session = await FFmpegKit.execute(cmd);
    const returnCode = await session.getReturnCode();
    if (ReturnCode.isSuccess(returnCode)) {
      return outputUri;
    }
    const logs = await session.getAllLogsAsString();
    console.error('FFmpeg failed:', logs);
    return null;
  } catch (error) {
    console.error('FFmpeg error:', error);
    return null;
  }
}

export function isVideoExportSupported(): boolean {
  try {
    require('ffmpeg-kit-react-native');
    return true;
  } catch {
    return false;
  }
}
