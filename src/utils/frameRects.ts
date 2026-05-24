import type { CanvasPresetId } from '@/constants/canvasPresets';
import { FRAME_IMG_H, FRAME_IMG_W, getMaxFrameScale, isStoreCanvasPreset } from '@/constants/canvasPresets';
import type { TemplateId } from '@/constants/templates';
import type { FrameId } from '@/stores/useEditorStore';
import type { ScreenRect } from '@/utils/layerLayout';
import { getLogicalCanvasSize } from '@/utils/canvasMetrics';

const IPHONE_TARGET_BOUNDS = {
  minX: 228,
  minY: 301,
  maxX: 834,
  maxY: 1594,
} as const;

const IPHONE_SCREEN_ASSET_BOUNDS = {
  minX: 228,
  minY: 301,
  maxX: 834,
  maxY: 1594,
} as const;

const IPHONE_OVERLAY_HOLE_BOUNDS = {
  minX: 217,
  minY: 287,
  maxX: 801,
  maxY: 1554,
} as const;

const IPHONE_SCREEN_ASSET_SIZE = {
  width: 1035,
  height: 1709,
} as const;

const IPHONE_OVERLAY_ASSET_SIZE = {
  width: 1043,
  height: 1724,
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
  primaryScreenFrame: FrameDrawRect | null;
  secondaryScreenFrame: FrameDrawRect | null;
  primaryOverlayFrame: FrameDrawRect | null;
  secondaryOverlayFrame: FrameDrawRect | null;
  appIconFrame: { x: number; y: number; size: number; cornerRadius: number } | null;
};

function rectFromBounds(drawX: number, drawY: number, scale: number): ScreenRect {
  const { minX, minY, maxX, maxY } = IPHONE_TARGET_BOUNDS;
  return {
    x: drawX + minX * scale,
    y: drawY + minY * scale,
    width: (maxX - minX + 1) * scale,
    height: (maxY - minY + 1) * scale,
  };
}

function mapAssetBoundsToTarget(
  targetRect: ScreenRect,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  assetSize: { width: number; height: number }
): FrameDrawRect {
  const boundWidth = bounds.maxX - bounds.minX + 1;
  const boundHeight = bounds.maxY - bounds.minY + 1;
  const scaleX = targetRect.width / boundWidth;
  const scaleY = targetRect.height / boundHeight;
  return {
    x: targetRect.x - bounds.minX * scaleX,
    y: targetRect.y - bounds.minY * scaleY,
    width: assetSize.width * scaleX,
    height: assetSize.height * scaleY,
  };
}

function mapVisibleBoundsFromFrame(
  frame: FrameDrawRect,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  assetSize: { width: number; height: number }
): ScreenRect {
  const scaleX = frame.width / assetSize.width;
  const scaleY = frame.height / assetSize.height;
  return {
    x: frame.x + bounds.minX * scaleX,
    y: frame.y + bounds.minY * scaleY,
    width: (bounds.maxX - bounds.minX + 1) * scaleX,
    height: (bounds.maxY - bounds.minY + 1) * scaleY,
  };
}

function intersectRects(a: ScreenRect, b: ScreenRect): ScreenRect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

function expandFrameRect(frame: FrameDrawRect, amount: number): FrameDrawRect {
  return {
    x: frame.x - amount,
    y: frame.y - amount,
    width: frame.width + amount * 2,
    height: frame.height + amount * 2,
  };
}

function getScreenOverscan(targetRect: ScreenRect): number {
  // Scale the white-screen expansion with the actual displayed screen width.
  // This keeps single close to the current look while reducing overscan in double/split.
  return Math.max(0, Math.round(targetRect.width * 0.027));
}

export function computeFramePresentation(params: Params): FramePresentation {
  const { templateId, selectedFrameId, frameScale, framePosition, canvasPresetId, pixelRatio } = params;
  const { canvasWidth, canvasHeight } = getLogicalCanvasSize(canvasPresetId, templateId, pixelRatio);

  if (selectedFrameId === 'none') {
    return {
      primary: null,
      secondary: null,
      primaryScreenFrame: null,
      secondaryScreenFrame: null,
      primaryOverlayFrame: null,
      secondaryOverlayFrame: null,
      appIconFrame: null,
    };
  }

  if (selectedFrameId === 'app-icon') {
    const size = Math.min(canvasWidth, canvasHeight) * 0.55 * frameScale;
    const x = (canvasWidth - size) / 2 + framePosition.x;
    const y = (canvasHeight - size) / 2 + framePosition.y;
    return {
      primary: { x, y, width: size, height: size },
      secondary: null,
      primaryScreenFrame: null,
      secondaryScreenFrame: null,
      primaryOverlayFrame: null,
      secondaryOverlayFrame: null,
      appIconFrame: { x, y, size, cornerRadius: size * 0.22 },
    };
  }

  if (selectedFrameId !== 'iphone') {
    return {
      primary: null,
      secondary: null,
      primaryScreenFrame: null,
      secondaryScreenFrame: null,
      primaryOverlayFrame: null,
      secondaryOverlayFrame: null,
      appIconFrame: null,
    };
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

    const primaryBase = rectFromBounds(leftDrawX, drawY, scale);
    const secondaryBase = rectFromBounds(rightDrawX, drawY, scale);
    const primaryScreenFrame = expandFrameRect(
      mapAssetBoundsToTarget(primaryBase, IPHONE_SCREEN_ASSET_BOUNDS, IPHONE_SCREEN_ASSET_SIZE),
      getScreenOverscan(primaryBase)
    );
    const secondaryScreenFrame = expandFrameRect(
      mapAssetBoundsToTarget(secondaryBase, IPHONE_SCREEN_ASSET_BOUNDS, IPHONE_SCREEN_ASSET_SIZE),
      getScreenOverscan(secondaryBase)
    );
    const primary = intersectRects(
      mapVisibleBoundsFromFrame(primaryScreenFrame, IPHONE_SCREEN_ASSET_BOUNDS, IPHONE_SCREEN_ASSET_SIZE),
      primaryBase
    );
    const secondary = intersectRects(
      mapVisibleBoundsFromFrame(secondaryScreenFrame, IPHONE_SCREEN_ASSET_BOUNDS, IPHONE_SCREEN_ASSET_SIZE),
      secondaryBase
    );
    return {
      primary,
      secondary,
      primaryScreenFrame,
      secondaryScreenFrame,
      primaryOverlayFrame: mapAssetBoundsToTarget(primaryBase, IPHONE_OVERLAY_HOLE_BOUNDS, IPHONE_OVERLAY_ASSET_SIZE),
      secondaryOverlayFrame: mapAssetBoundsToTarget(secondaryBase, IPHONE_OVERLAY_HOLE_BOUNDS, IPHONE_OVERLAY_ASSET_SIZE),
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

    const primaryBase = rectFromBounds(drawX, drawY, scale);
    const primaryScreenFrame = expandFrameRect(
      mapAssetBoundsToTarget(primaryBase, IPHONE_SCREEN_ASSET_BOUNDS, IPHONE_SCREEN_ASSET_SIZE),
      getScreenOverscan(primaryBase)
    );
    const primary = intersectRects(
      mapVisibleBoundsFromFrame(primaryScreenFrame, IPHONE_SCREEN_ASSET_BOUNDS, IPHONE_SCREEN_ASSET_SIZE),
      primaryBase
    );
    return {
      primary,
      secondary: null,
      primaryScreenFrame,
      secondaryScreenFrame: null,
      primaryOverlayFrame: mapAssetBoundsToTarget(primaryBase, IPHONE_OVERLAY_HOLE_BOUNDS, IPHONE_OVERLAY_ASSET_SIZE),
      secondaryOverlayFrame: null,
      appIconFrame: null,
    };
  }

  const baseScale = Math.min(canvasWidth / FRAME_IMG_W, canvasHeight / FRAME_IMG_H);
  const scale = baseScale * Math.min(frameScale, getMaxFrameScale(canvasWidth, canvasHeight, templateId));
  const drawWidth = FRAME_IMG_W * scale;
  const drawHeight = FRAME_IMG_H * scale;
  const drawX = (canvasWidth - drawWidth) / 2 + framePosition.x;
  const drawY = (canvasHeight - drawHeight) / 2 + framePosition.y;

  const primaryBase = rectFromBounds(drawX, drawY, scale);
  const primaryScreenFrame = expandFrameRect(
    mapAssetBoundsToTarget(primaryBase, IPHONE_SCREEN_ASSET_BOUNDS, IPHONE_SCREEN_ASSET_SIZE),
    getScreenOverscan(primaryBase)
  );
  const primary = intersectRects(
    mapVisibleBoundsFromFrame(primaryScreenFrame, IPHONE_SCREEN_ASSET_BOUNDS, IPHONE_SCREEN_ASSET_SIZE),
    primaryBase
  );
  return {
    primary,
    secondary: null,
    primaryScreenFrame,
    secondaryScreenFrame: null,
    primaryOverlayFrame: mapAssetBoundsToTarget(primaryBase, IPHONE_OVERLAY_HOLE_BOUNDS, IPHONE_OVERLAY_ASSET_SIZE),
    secondaryOverlayFrame: null,
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
