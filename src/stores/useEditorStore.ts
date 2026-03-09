import { create } from 'zustand';
import type { RefObject } from 'react';
import type { CanvasRef } from '@shopify/react-native-skia';
import { Layer, Background, ShadowConfig, StrokeConfig } from '../types';

type ScreenRect = { x: number; y: number; width: number; height: number };

export type FrameId = 'iphone' | 'iphone-se' | 'none';

export type FrameScreenType = 'transparent' | 'opaque' | null;

interface EditorState {
  sessionName: string;
  layers: Layer[];
  selectedLayerId: string | null;
  frameEnabled: boolean;
  selectedFrameId: FrameId;
  frameScale: number;
  frameScreenRect: ScreenRect | null;
  frameScreenType: FrameScreenType;
  background: Background;
  activeTool: 'select' | 'background' | 'text' | 'canvas' | 'layers' | 'frame';
  canvasRef: RefObject<CanvasRef | null> | null;

  setSessionName: (name: string) => void;
  setLayers: (layers: Layer[]) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;
  setFrameEnabled: (enabled: boolean) => void;
  setSelectedFrameId: (id: FrameId) => void;
  setFrameScale: (scale: number) => void;
  setFrameScreenRect: (rect: ScreenRect | null, type: FrameScreenType) => void;
  setBackground: (bg: Background) => void;
  setActiveTool: (tool: EditorState['activeTool']) => void;
  setCanvasRef: (ref: RefObject<CanvasRef | null>) => void;
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

export const useEditorStore = create<EditorState>((set) => ({
  sessionName: '無題のモックアップ',
  layers: [],
  selectedLayerId: null,
  frameEnabled: true,
  selectedFrameId: 'iphone',
  frameScale: 1.0,
  frameScreenRect: null,
  frameScreenType: null,
  background: defaultBackground,
  activeTool: 'select',
  canvasRef: null,

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
  setFrameEnabled: (enabled) => set({ frameEnabled: enabled }),
  setSelectedFrameId: (id) => set({ selectedFrameId: id, frameEnabled: id !== 'none', frameScale: 1.0, frameScreenRect: null, frameScreenType: null }),
  setFrameScale: (scale) => set({ frameScale: scale }),
  setFrameScreenRect: (rect, type) => set({ frameScreenRect: rect, frameScreenType: type }),
  setBackground: (bg) => set({ background: bg }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setCanvasRef: (ref) => set({ canvasRef: ref }),
  reset: () =>
    set({
      sessionName: '無題のモックアップ',
      layers: [],
      selectedLayerId: null,
      frameEnabled: true,
      selectedFrameId: 'iphone',
      frameScale: 1.0,
      frameScreenRect: null,
      frameScreenType: null,
      background: defaultBackground,
      activeTool: 'select',
      canvasRef: null,
    }),
}));
