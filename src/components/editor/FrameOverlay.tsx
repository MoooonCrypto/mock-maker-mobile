import { useMemo } from 'react';
import { PixelRatio, View } from 'react-native';
import {
  Canvas as SkiaCanvas,
  Image,
  useImage,
} from '@shopify/react-native-skia';
import { useEditorStore } from '@/stores/useEditorStore';
import { computeFramePresentation } from '@/utils/frameRects';
import { getLogicalCanvasSize } from '@/utils/canvasMetrics';

const FRAME_IMAGE_IPHONE_OVERLAY = require('../../../assets/frame_1_ver4.png');

export function FrameOverlay() {
  const templateId = useEditorStore((s) => s.templateId);
  const canvasPresetId = useEditorStore((s) => s.canvasPresetId);
  const selectedFrameId = useEditorStore((s) => s.selectedFrameId);
  const frameScale = useEditorStore((s) => s.frameScale);
  const framePosition = useEditorStore((s) => s.framePosition);
  const hasVideoLayers = useEditorStore((s) => s.layers.some((layer) => layer.type === 'video'));
  const pixelRatio = PixelRatio.get();
  const { canvasWidth, canvasHeight } = getLogicalCanvasSize(canvasPresetId, templateId, pixelRatio);
  const frameImage = useImage(FRAME_IMAGE_IPHONE_OVERLAY);

  const framePresentation = useMemo(
    () =>
      computeFramePresentation({
        templateId,
        selectedFrameId,
        frameScale,
        framePosition,
        canvasPresetId,
        pixelRatio,
      }),
    [canvasPresetId, framePosition, frameScale, pixelRatio, selectedFrameId, templateId]
  );

  if (selectedFrameId !== 'iphone' || !hasVideoLayers || !frameImage) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <SkiaCanvas style={{ width: canvasWidth, height: canvasHeight }}>
        {framePresentation.primaryOverlayFrame && (
          <Image
            image={frameImage}
            x={framePresentation.primaryOverlayFrame.x}
            y={framePresentation.primaryOverlayFrame.y}
            width={framePresentation.primaryOverlayFrame.width}
            height={framePresentation.primaryOverlayFrame.height}
            fit="fill"
          />
        )}
        {templateId === 'double' && framePresentation.secondaryOverlayFrame && (
          <Image
            image={frameImage}
            x={framePresentation.secondaryOverlayFrame.x}
            y={framePresentation.secondaryOverlayFrame.y}
            width={framePresentation.secondaryOverlayFrame.width}
            height={framePresentation.secondaryOverlayFrame.height}
            fit="fill"
          />
        )}
      </SkiaCanvas>
    </View>
  );
}
