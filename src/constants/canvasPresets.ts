export type CanvasPresetId =
  | 'store-67'
  | 'store-69'
  | 'store-65'
  | 'square'
  | 'rect-43'
  | 'rect-169'

export interface CanvasPreset {
  id: CanvasPresetId
  label: string
  group: 'ストア申請用' | '汎用サイズ'
  exportW: number
  exportH: number
}

export function isStoreCanvasPreset(id: CanvasPresetId): boolean {
  return id === 'store-67' || id === 'store-69' || id === 'store-65'
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'store-67', label: '6.5/6.7インチ (1284×2778)', group: 'ストア申請用', exportW: 1284, exportH: 2778 },
  { id: 'store-69', label: '6.9インチ (1320×2868)', group: 'ストア申請用', exportW: 1320, exportH: 2868 },
  { id: 'store-65', label: '6.5インチ (1242×2688)', group: 'ストア申請用', exportW: 1242, exportH: 2688 },
  { id: 'square',   label: '正方形 1:1 (1080×1080)', group: '汎用サイズ', exportW: 1080, exportH: 1080 },
  { id: 'rect-43',  label: '縦長 3:4 (1080×1440)',   group: '汎用サイズ', exportW: 1080, exportH: 1440 },
  { id: 'rect-169', label: '横長 16:9 (1920×1080)',  group: '汎用サイズ', exportW: 1920, exportH: 1080 },
]

export const DEFAULT_PRESET_ID: CanvasPresetId = 'store-67'

export function getPreset(id: CanvasPresetId): CanvasPreset {
  return CANVAS_PRESETS.find(p => p.id === id)!
}

// iPhone front-frame asset pixel dimensions (frame_1_ver4.png: 1043×1724)
export const FRAME_IMG_W = 1043
export const FRAME_IMG_H = 1724

/**
 * Calculate max frameScale that keeps the iPhone frame fully within the canvas height.
 * Width overflow (sides clipped) is allowed — only height is constrained.
 */
export function getMaxFrameScale(
  canvasW: number,
  canvasH: number,
  templateId: string,
  padding = 0.95,
): number {
  if (templateId === 'top-half') {
    return 1.6
  }
  const effectiveW = templateId === 'double' ? canvasW / 2 : canvasW
  const baseScale = Math.min(effectiveW / FRAME_IMG_W, canvasH / FRAME_IMG_H)
  return (canvasH / (FRAME_IMG_H * baseScale)) * padding
}
