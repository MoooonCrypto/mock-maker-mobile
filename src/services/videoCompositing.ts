import { getVideoCompositorModule, type VideoOverlayInput } from '../../modules/video-compositor/src';

export async function composeVideoMockup(
  backgroundUri: string,
  overlays: VideoOverlayInput[]
): Promise<string> {
  return await getVideoCompositorModule().composeAsync(backgroundUri, overlays);
}
