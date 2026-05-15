import { getPreset, type CanvasPresetId } from '@/constants/canvasPresets';
import type { TemplateId } from '@/constants/templates';

export function getLogicalCanvasSize(
  canvasPresetId: CanvasPresetId,
  templateId: TemplateId,
  pixelRatio: number
) {
  const preset = getPreset(canvasPresetId);
  return {
    canvasWidth: preset.exportW / pixelRatio,
    canvasHeight: templateId === 'split'
      ? (preset.exportH / pixelRatio) / 2
      : preset.exportH / pixelRatio,
    exportWidth: preset.exportW,
    exportHeight: preset.exportH,
  };
}
