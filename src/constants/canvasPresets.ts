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

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'store-67', label: '6.7インチ (1290×2796)', group: 'ストア申請用', exportW: 1290, exportH: 2796 },
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
