import { create } from 'zustand';
import type { RefObject } from 'react';
import type { CanvasRef } from '@shopify/react-native-skia';
import { Layer, DeviceFrame, Background, ShadowConfig, StrokeConfig } from '../types';

interface EditorState {
  sessionName: string;
  layers: Layer[];
  selectedLayerId: string | null;
  deviceFrame: DeviceFrame | null;
  background: Background;
  activeTool: 'select' | 'frame' | 'background' | 'text' | 'canvas' | 'layers';
  canvasRef: RefObject<CanvasRef | null> | null;

  setSessionName: (name: string) => void;
  setLayers: (layers: Layer[]) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;
  setDeviceFrame: (frame: DeviceFrame | null) => void;
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
  // Text layers appear above the device frame area (y = -180 ≈ above center)
  position: type === 'text' ? { x: 0, y: -180 } : { x: 0, y: 0 },
  size,
  rotation: 0,
  opacity: 1,
  cornerRadius: 0,
  shadow: { ...defaultShadow },
  stroke: { ...defaultStroke },
  zIndex: 0,
  ...(type === 'text' && { textColor: '#ffffff', fontWeight: 'normal' as const }),
});

export const useEditorStore = create<EditorState>((set) => ({
  sessionName: '無題のモックアップ',
  layers: [],
  selectedLayerId: null,
  deviceFrame: null,
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
  setDeviceFrame: (frame) => set({ deviceFrame: frame }),
  setBackground: (bg) => set({ background: bg }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setCanvasRef: (ref) => set({ canvasRef: ref }),
  reset: () =>
    set({
      sessionName: '無題のモックアップ',
      layers: [],
      selectedLayerId: null,
      deviceFrame: null,
      background: defaultBackground,
      activeTool: 'select',
      canvasRef: null,
    }),
}));
