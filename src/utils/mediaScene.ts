import type { CanvasPresetId } from '@/constants/canvasPresets';
import type { TemplateId } from '@/constants/templates';
import type { Layer } from '@/types';
import type { FrameId } from '@/stores/useEditorStore';
import { computeFramePresentation } from '@/utils/frameRects';
import { getActiveScreenRect, getFreeformMediaRect, type ScreenRect } from '@/utils/layerLayout';
import { computeCropRatios, computeFramedMediaDrawRect, createFullMediaCrop, hasMediaCrop, type MediaCrop } from '@/utils/mediaCrop';

export type MediaSceneLayer = {
  layer: Layer & { type: 'image' | 'video' };
  order: number;
  targetRect: ScreenRect;
  drawRect: ScreenRect;
  sourceCrop: MediaCrop;
  sourceCropRatios: {
    cropXRatio: number;
    cropYRatio: number;
    cropWRatio: number;
    cropHRatio: number;
  };
  cornerRadius: number;
  isFramed: boolean;
};

type BuildMediaSceneParams = {
  layers: Layer[];
  templateId: TemplateId;
  selectedFrameId: FrameId;
  frameScale: number;
  framePosition: { x: number; y: number };
  canvasPresetId: CanvasPresetId;
  pixelRatio: number;
  canvasWidth: number;
  canvasHeight: number;
};

export function getFrameCornerRadius(frameId: FrameId, rectWidth: number): number {
  if (frameId === 'app-icon') return rectWidth * 0.22;
  if (frameId === 'iphone') return rectWidth * 0.11;
  return 18;
}

function getMediaOverscan(frameId: FrameId, targetRect: ScreenRect): number {
  if (frameId !== 'iphone') return 0;
  return 0;
}

function expandScreenRect(rect: ScreenRect, amount: number): ScreenRect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

export function buildMediaScene({
  layers,
  templateId,
  selectedFrameId,
  frameScale,
  framePosition,
  canvasPresetId,
  pixelRatio,
  canvasWidth,
  canvasHeight,
}: BuildMediaSceneParams): MediaSceneLayer[] {
  const framePresentation = computeFramePresentation({
    templateId,
    selectedFrameId,
    frameScale,
    framePosition,
    canvasPresetId,
    pixelRatio,
  });

  return layers
    .filter((layer): layer is Layer & { type: 'image' | 'video' } => layer.type === 'image' || layer.type === 'video')
    .map((layer, order) => {
      const activeScreenRect = getActiveScreenRect(layer, framePresentation.primary, framePresentation.secondary);
      const sourceWidth = Math.max(layer.size.width || 1, 1);
      const sourceHeight = Math.max(layer.size.height || 1, 1);
      const targetRect = activeScreenRect
        ? expandScreenRect(activeScreenRect, getMediaOverscan(selectedFrameId, activeScreenRect))
        : getFreeformMediaRect(layer, canvasWidth, canvasHeight);
      const sourceCrop = activeScreenRect && hasMediaCrop(layer)
        ? {
            cropX: layer.cropX,
            cropY: layer.cropY,
            cropW: layer.cropW,
            cropH: layer.cropH,
          }
        : createFullMediaCrop(sourceWidth, sourceHeight);
      const drawRect = activeScreenRect
        ? computeFramedMediaDrawRect(sourceWidth, sourceHeight, targetRect, sourceCrop)
        : targetRect;

      return {
        layer,
        order,
        targetRect,
        drawRect,
        sourceCrop,
        sourceCropRatios: computeCropRatios(sourceCrop, sourceWidth, sourceHeight),
        cornerRadius: activeScreenRect ? getFrameCornerRadius(selectedFrameId, targetRect.width) : 18,
        isFramed: Boolean(activeScreenRect),
      };
    });
}
