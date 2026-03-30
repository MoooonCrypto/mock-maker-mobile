import { create } from 'zustand';
import type { RefObject } from 'react';
import type { CanvasRef } from '@shopify/react-native-skia';
import { Layer, Background, ShadowConfig, StrokeConfig } from '../types';
import type { TemplateId } from '../constants/templates';
import type { CanvasPresetId } from '../constants/canvasPresets';
import { DEFAULT_PRESET_ID } from '../constants/canvasPresets';

type ScreenRect = { x: number; y: number; width: number; height: number };

export type FrameId = 'iphone' | 'iphone-se' | 'app-icon' | 'none';

export type FrameScreenType = 'transparent' | 'opaque' | null;

interface EditorState {
  templateId: TemplateId;
  sessionName: string;
  layers: Layer[];
  selectedLayerId: string | null;
  selectedFrameId: FrameId;
  frameScale: number;
  framePosition: { x: number; y: number };
  frameScreenRect: ScreenRect | null;
  frameScreenRect2: ScreenRect | null;
  frameScreenType: FrameScreenType;
  background: Background;
  activeTool: 'select' | 'background' | 'text' | 'canvas' | 'layers' | 'frame' | 'sticker';
  canvasRef: RefObject<CanvasRef | null> | null;
  canvasPresetId: CanvasPresetId;

  setTemplateId: (id: TemplateId) => void;
  setSessionName: (name: string) => void;
  setLayers: (layers: Layer[]) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;
  setSelectedFrameId: (id: FrameId) => void;
  setFrameScale: (scale: number) => void;
  setFramePosition: (pos: { x: number; y: number }) => void;
  setFrameScreenRect: (rect: ScreenRect | null, type: FrameScreenType) => void;
  setFrameScreenRect2: (rect: ScreenRect | null) => void;
  setBackground: (bg: Background) => void;
  setActiveTool: (tool: EditorState['activeTool']) => void;
  addStickerLayer: (key: string, size: { width: number; height: number }) => void;
  setCanvasRef: (ref: RefObject<CanvasRef | null>) => void;
  setCanvasPresetId: (id: CanvasPresetId) => void;
  reset: () => void;
}

const defaultBackground: Background = {
  type: 'gradient',
  gradient: { colors: ['#667eea', '#764ba2'], angle: 135 },
};

const defaultShadow: ShadowConfig = {
  enabled: false,
  color: '#000000',
  offsetX: 0,
  offsetY: 4,
  blur: 12,
  opacity: 0.25,
};

const defaultStroke: StrokeConfig = {
  enabled: false,
  color: '#000000',
  width: 0,
};

export const createDefaultLayer = (
  type: Layer['type'],
  uri: string,
  size: { width: number; height: number }
): Layer => ({
  id: Date.now().toString(),
  type,
  uri,
  position: type === 'text' ? { x: 0, y: -250 } : { x: 0, y: 0 },
  size,
  rotation: 0,
  opacity: 1,
  cornerRadius: 0,
  shadow: { ...defaultShadow },
  stroke: { ...defaultStroke },
  zIndex: 0,
  ...(type === 'text' && { textColor: '#ffffff', fontWeight: 'normal' as const, fontFamily: 'noto-sans-jp' as const }),
});

function templateDefaults(id: TemplateId): {
  selectedFrameId: FrameId;
  frameScale: number;
  framePosition: { x: number; y: number };
} {
  switch (id) {
    case 'single':   return { selectedFrameId: 'iphone',    frameScale: 0.85, framePosition: { x: 0, y: 0 } };
    case 'double':   return { selectedFrameId: 'iphone',    frameScale: 0.85, framePosition: { x: 0, y: 0 } };
    case 'top-half': return { selectedFrameId: 'iphone',    frameScale: 1.0,  framePosition: { x: 0, y: 0 } };
    case 'split':    return { selectedFrameId: 'iphone',    frameScale: 0.85, framePosition: { x: 0, y: 0 } };
    case 'icon':     return { selectedFrameId: 'app-icon',  frameScale: 0.85, framePosition: { x: 0, y: 0 } };
    case 'free':     return { selectedFrameId: 'none',      frameScale: 0.85, framePosition: { x: 0, y: 0 } };
    default:         return { selectedFrameId: 'iphone',    frameScale: 0.85, framePosition: { x: 0, y: 0 } };
  }
}

export const useEditorStore = create<EditorState>((set) => ({
  templateId: 'single',
  sessionName: '無題のモックアップ',
  layers: [],
  selectedLayerId: null,
  selectedFrameId: 'iphone',
  frameScale: 0.85,
  framePosition: { x: 0, y: 0 },
  frameScreenRect: null,
  frameScreenRect2: null,
  frameScreenType: null,
  background: defaultBackground,
  activeTool: 'select',
  canvasRef: null,
  canvasPresetId: DEFAULT_PRESET_ID,

  setTemplateId: (id) => set({
    templateId: id,
    ...templateDefaults(id),
    frameScreenRect: null,
    frameScreenRect2: null,
    frameScreenType: null,
  }),
  setSessionName: (name) => set({ sessionName: name }),
  setLayers: (layers) => set({ layers }),
  addLayer: (layer) => set((s) => ({ layers: [...s.layers, layer], selectedLayerId: layer.id })),
  updateLayer: (id, updates) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),
  removeLayer: (id) =>
    set((s) => ({
      layers: s.layers.filter((l) => l.id !== id),
      selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
    })),
  selectLayer: (id) => set({ selectedLayerId: id }),
  setSelectedFrameId: (id) => set({
    selectedFrameId: id,
    frameScale: 0.85,
    framePosition: { x: 0, y: 0 },
    frameScreenRect: null,
    frameScreenRect2: null,
    frameScreenType: null,
  }),
  setFrameScale: (scale) => set({ frameScale: scale }),
  setFramePosition: (pos) => set({ framePosition: pos }),
  setFrameScreenRect: (rect, type) => set({ frameScreenRect: rect, frameScreenType: type }),
  setFrameScreenRect2: (rect) => set({ frameScreenRect2: rect }),
  setBackground: (bg) => set({ background: bg }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  addStickerLayer: (key, size) =>
    set((s) => {
      const layer = createDefaultLayer('sticker', key, size);
      return { layers: [...s.layers, layer], selectedLayerId: layer.id };
    }),
  setCanvasRef: (ref) => set({ canvasRef: ref }),
  setCanvasPresetId: (id) => set((s) => ({
    canvasPresetId: id,
    ...templateDefaults(s.templateId),
    frameScreenRect: null,
    frameScreenRect2: null,
    frameScreenType: null,
  })),
  reset: () =>
    set({
      templateId: 'single',
      sessionName: '無題のモックアップ',
      layers: [],
      selectedLayerId: null,
      selectedFrameId: 'iphone',
      frameScale: 0.85,
      framePosition: { x: 0, y: 0 },
      frameScreenRect: null,
      frameScreenRect2: null,
      frameScreenType: null,
      background: defaultBackground,
      activeTool: 'select',
      canvasRef: null,
      canvasPresetId: DEFAULT_PRESET_ID,
    }),
}));
