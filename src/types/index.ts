export interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  layers: Layer[];
  background: Background;
  deviceFrame?: DeviceFrame;
  canvasSize: { width: number; height: number };
}

export interface Layer {
  id: string;
  type: 'image' | 'video' | 'text' | 'sticker';
  uri: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  opacity: number;
  cornerRadius: number;
  shadow: ShadowConfig;
  stroke: StrokeConfig;
  zIndex: number;
  // Frame slot for 'double' template (0 = left, 1 = right)
  frameSlot?: 0 | 1;
  // Image crop rect (original image pixels)
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
  durationMs?: number;
  // Text-only fields
  textColor?: string;
  underline?: boolean;
  fontWeight?: 'normal' | 'bold' | 'black';
  fontFamily?: 'noto-sans-jp' | 'noto-serif-jp' | 'roboto' | 'inter' | 'lato' | 'montserrat' | 'oswald' | 'raleway' | 'nunito' | 'open-sans' | 'm-plus-1p' | 'm-plus-r' | 'biz-ud' | 'zen-kaku' | 'sawarabi-g' | 'sawarabi-m' | 'kosugi-m' | 'dot-gothic' | 'playfair' | 'merriweather';
}

export interface ShadowConfig {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  opacity: number;
}

export interface StrokeConfig {
  enabled: boolean;
  color: string;
  width: number;
}

export interface DeviceFrame {
  deviceId: string;
  category: 'iphone' | 'ipad' | 'mac' | 'android' | 'watch';
  name: string;
  screenSize: { width: number; height: number };
  frameImageUri: string;
  screenOffset: { x: number; y: number };
}

export interface Background {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  gradient?: { colors: string[]; angle: number };
  imageUri?: string;
}

export interface ExportSettings {
  format: 'png' | 'jpg';
  quality: 'standard' | 'high';
  scale: number;
}
