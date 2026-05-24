import { getVideoCompositorModule, type FrameOverlayInput, type VideoOverlayInput } from '../../modules/video-compositor/src';

export async function composeVideoMockup(
  backgroundUri: string,
  overlays: VideoOverlayInput[],
  frameOverlays: FrameOverlayInput[] = []
): Promise<string> {
  return await getVideoCompositorModule().composeAsync(backgroundUri, overlays, frameOverlays);
}
