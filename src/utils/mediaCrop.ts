import type { Layer } from '@/types';
import type { ScreenRect } from '@/utils/layerLayout';

export type MediaCrop = {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
};

export type MediaDrawRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function hasMediaCrop(layer: Pick<Layer, 'cropX' | 'cropY' | 'cropW' | 'cropH'>): layer is Pick<Layer, 'cropX' | 'cropY' | 'cropW' | 'cropH'> & MediaCrop {
  return (
    layer.cropX !== undefined &&
    layer.cropY !== undefined &&
    layer.cropW !== undefined &&
    layer.cropH !== undefined
  );
}

export function createFullMediaCrop(width: number, height: number): MediaCrop {
  return {
    cropX: 0,
    cropY: 0,
    cropW: Math.max(1, Math.round(width)),
    cropH: Math.max(1, Math.round(height)),
  };
}

export function computeFramedMediaDrawRect(
  sourceWidth: number,
  sourceHeight: number,
  targetRect: ScreenRect,
  crop?: MediaCrop
): MediaDrawRect {
  const baseCrop = crop ?? createFullMediaCrop(sourceWidth, sourceHeight);
  const scaleX = targetRect.width / Math.max(baseCrop.cropW, 1);
  const scaleY = targetRect.height / Math.max(baseCrop.cropH, 1);
  const effectiveScale = Math.max(scaleX, scaleY);
  const width = sourceWidth * effectiveScale;
  const height = sourceHeight * effectiveScale;
  const cropCenterX = baseCrop.cropX + baseCrop.cropW / 2;
  const cropCenterY = baseCrop.cropY + baseCrop.cropH / 2;

  return {
    x: targetRect.x + targetRect.width / 2 - cropCenterX * effectiveScale,
    y: targetRect.y + targetRect.height / 2 - cropCenterY * effectiveScale,
    width,
    height,
  };
}

export function computeCropRatios(
  crop: MediaCrop | undefined,
  sourceWidth: number,
  sourceHeight: number
): { cropXRatio: number; cropYRatio: number; cropWRatio: number; cropHRatio: number } {
  const safeCrop = crop ?? createFullMediaCrop(sourceWidth, sourceHeight);
  return {
    cropXRatio: safeCrop.cropX / Math.max(sourceWidth, 1),
    cropYRatio: safeCrop.cropY / Math.max(sourceHeight, 1),
    cropWRatio: safeCrop.cropW / Math.max(sourceWidth, 1),
    cropHRatio: safeCrop.cropH / Math.max(sourceHeight, 1),
  };
}
