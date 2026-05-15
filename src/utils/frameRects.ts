import type { CanvasPresetId } from '@/constants/canvasPresets';
import { FRAME_IMG_H, FRAME_IMG_W, getMaxFrameScale, isStoreCanvasPreset } from '@/constants/canvasPresets';
import type { TemplateId } from '@/constants/templates';
import type { FrameId } from '@/stores/useEditorStore';
import type { ScreenRect } from '@/utils/layerLayout';
import { getLogicalCanvasSize } from '@/utils/canvasMetrics';

const IPHONE_SCREEN_BOUNDS = {
  minX: 228,
  minY: 216,
  maxX: 808,
  maxY: 1463,
} as const;

type Params = {
  templateId: TemplateId;
  selectedFrameId: FrameId;
  frameScale: number;
  framePosition: { x: number; y: number };
  canvasPresetId: CanvasPresetId;
  pixelRatio: number;
};

export type FrameDrawRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FramePresentation = {
  primary: ScreenRect | null;
  secondary: ScreenRect | null;
  primaryFrame: FrameDrawRect | null;
  secondaryFrame: FrameDrawRect | null;
  appIconFrame: { x: number; y: number; size: number; cornerRadius: number } | null;
};

function rectFromBounds(drawX: number, drawY: number, scale: number): ScreenRect {
  const { minX, minY, maxX, maxY } = IPHONE_SCREEN_BOUNDS;
  return {
    x: drawX + minX * scale,
    y: drawY + minY * scale,
    width: (maxX - minX + 1) * scale,
    height: (maxY - minY + 1) * scale,
  };
}

export function computeFramePresentation(params: Params): FramePresentation {
  const { templateId, selectedFrameId, frameScale, framePosition, canvasPresetId, pixelRatio } = params;
  const { canvasWidth, canvasHeight } = getLogicalCanvasSize(canvasPresetId, templateId, pixelRatio);

  if (selectedFrameId === 'none') {
    return { primary: null, secondary: null, primaryFrame: null, secondaryFrame: null, appIconFrame: null };
  }

  if (selectedFrameId === 'app-icon') {
    const size = Math.min(canvasWidth, canvasHeight) * 0.55 * frameScale;
    const x = (canvasWidth - size) / 2 + framePosition.x;
    const y = (canvasHeight - size) / 2 + framePosition.y;
    return {
      primary: { x, y, width: size, height: size },
      secondary: null,
      primaryFrame: null,
      secondaryFrame: null,
      appIconFrame: { x, y, size, cornerRadius: size * 0.22 },
    };
  }

  if (selectedFrameId !== 'iphone') {
    return { primary: null, secondary: null, primaryFrame: null, secondaryFrame: null, appIconFrame: null };
  }

  if (templateId === 'double') {
    const halfWidth = canvasWidth / 2;
    const baseScale = Math.min(halfWidth / FRAME_IMG_W, canvasHeight / FRAME_IMG_H);
    const scale = baseScale * Math.min(frameScale, getMaxFrameScale(canvasWidth, canvasHeight, templateId));
    const drawWidth = FRAME_IMG_W * scale;
    const drawHeight = FRAME_IMG_H * scale;
    const leftDrawX = (halfWidth - drawWidth) / 2 + framePosition.x;
    const rightDrawX = halfWidth + (halfWidth - drawWidth) / 2 + framePosition.x;
    const drawY = (canvasHeight - drawHeight) / 2 + framePosition.y;

    return {
      primary: rectFromBounds(leftDrawX, drawY, scale),
      secondary: rectFromBounds(rightDrawX, drawY, scale),
      primaryFrame: { x: leftDrawX, y: drawY, width: drawWidth, height: drawHeight },
      secondaryFrame: { x: rightDrawX, y: drawY, width: drawWidth, height: drawHeight },
      appIconFrame: null,
    };
  }

  if (templateId === 'top-half') {
    const visibleFraction = 2 / 3;
    const widthFitScale = canvasWidth / FRAME_IMG_W;
    const topCropScale = (canvasHeight / visibleFraction) / FRAME_IMG_H;
    const aspectRatio = canvasWidth / canvasHeight;
    const baseTopScale = isStoreCanvasPreset(canvasPresetId)
      ? topCropScale * 0.72
      : aspectRatio >= 1
      ? widthFitScale * 0.82
      : aspectRatio >= 0.9
      ? widthFitScale * 1.0
      : widthFitScale * 1.15;

    const scale = baseTopScale * Math.min(frameScale, getMaxFrameScale(canvasWidth, canvasHeight, templateId));
    const drawWidth = FRAME_IMG_W * scale;
    const drawHeight = FRAME_IMG_H * scale;
    const drawX = (canvasWidth - drawWidth) / 2 + framePosition.x;
    const drawY = !isStoreCanvasPreset(canvasPresetId) && aspectRatio >= 1
      ? framePosition.y
      : canvasHeight - drawHeight * visibleFraction + framePosition.y;

    return {
      primary: rectFromBounds(drawX, drawY, scale),
      secondary: null,
      primaryFrame: { x: drawX, y: drawY, width: drawWidth, height: drawHeight },
      secondaryFrame: null,
      appIconFrame: null,
    };
  }

  const baseScale = Math.min(canvasWidth / FRAME_IMG_W, canvasHeight / FRAME_IMG_H);
  const scale = baseScale * Math.min(frameScale, getMaxFrameScale(canvasWidth, canvasHeight, templateId));
  const drawWidth = FRAME_IMG_W * scale;
  const drawHeight = FRAME_IMG_H * scale;
  const drawX = (canvasWidth - drawWidth) / 2 + framePosition.x;
  const drawY = (canvasHeight - drawHeight) / 2 + framePosition.y;

  return {
    primary: rectFromBounds(drawX, drawY, scale),
    secondary: null,
    primaryFrame: { x: drawX, y: drawY, width: drawWidth, height: drawHeight },
    secondaryFrame: null,
    appIconFrame: null,
  };
}

export function computeFrameScreenRects(params: Params): { primary: ScreenRect | null; secondary: ScreenRect | null } {
  const presentation = computeFramePresentation(params);
  return {
    primary: presentation.primary,
    secondary: presentation.secondary,
  };
}
