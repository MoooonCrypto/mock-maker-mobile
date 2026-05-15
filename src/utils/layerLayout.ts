import type { Layer } from '@/types';

export type ScreenRect = { x: number; y: number; width: number; height: number };

export function getActiveScreenRect(
  layer: Pick<Layer, 'frameSlot'>,
  screenRect: ScreenRect | null,
  screenRect2?: ScreenRect | null
): ScreenRect | null {
  if (layer.frameSlot === 1 && screenRect2) return screenRect2;
  return screenRect;
}

export function getFreeformMediaRect(
  layer: Pick<Layer, 'size' | 'position'>,
  canvasWidth: number,
  canvasHeight: number
): ScreenRect {
  const ar = (layer.size.width || 1) / (layer.size.height || 1);
  const maxW = canvasWidth * 0.9;
  const maxH = canvasHeight * 0.9;

  let width: number;
  let height: number;

  if (ar >= maxW / maxH) {
    width = maxW;
    height = maxW / ar;
  } else {
    height = maxH;
    width = maxH * ar;
  }

  return {
    x: (canvasWidth - width) / 2 + layer.position.x,
    y: (canvasHeight - height) / 2 + layer.position.y,
    width,
    height,
  };
}
