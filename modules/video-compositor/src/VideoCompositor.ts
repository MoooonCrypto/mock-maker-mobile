import { requireOptionalNativeModule } from 'expo-modules-core';

export type VideoOverlayInput = {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  cornerRadius: number;
  zIndex: number;
  order: number;
  cropXRatio?: number;
  cropYRatio?: number;
  cropWRatio?: number;
  cropHRatio?: number;
};

export type FrameOverlayInput = {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type VideoCompositorModule = {
  composeAsync(backgroundUri: string, overlays: VideoOverlayInput[], frameOverlays?: FrameOverlayInput[]): Promise<string>;
};

const videoCompositorModule =
  requireOptionalNativeModule<VideoCompositorModule>('VideoCompositor');

export function getVideoCompositorModule(): VideoCompositorModule {
  if (!videoCompositorModule) {
    throw new Error(
      'Native module "VideoCompositor" is not available in this build. Rebuild the iOS development client after pod install.'
    );
  }
  return videoCompositorModule;
}

export default videoCompositorModule;
