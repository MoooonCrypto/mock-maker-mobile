import { requireNativeModule } from 'expo-modules-core';

interface ComposeParams {
  backgroundImagePath: string;
  videoPath: string;
  screenRectX: number;
  screenRectY: number;
  screenRectWidth: number;
  screenRectHeight: number;
  outputPath: string;
}

export async function composeVideo(params: ComposeParams): Promise<string> {
  const NativeModule = requireNativeModule('VideoCompositor');
  return await NativeModule.composeVideo(params);
}
