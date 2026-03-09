import { useEffect, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import {
  Canvas as SkiaCanvas,
  useCanvasRef,
  Rect,
  LinearGradient,
  vec,
  Image,
  useImage,
  Shadow,
  Paint,
  Text as SkiaText,
  useFont,
  Group,
  Skia,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
  NotoSansJP_400Regular,
  NotoSansJP_700Bold,
  NotoSansJP_900Black,
} from '@expo-google-fonts/noto-sans-jp';
import {
  NotoSerifJP_400Regular,
  NotoSerifJP_700Bold,
  NotoSerifJP_900Black,
} from '@expo-google-fonts/noto-serif-jp';
import {
  Inter_400Regular,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {
  Lato_400Regular,
  Lato_700Bold,
  Lato_900Black,
} from '@expo-google-fonts/lato';
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_900Black,
} from '@expo-google-fonts/montserrat';
import {
  Oswald_400Regular,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  Raleway_400Regular,
  Raleway_700Bold,
  Raleway_900Black,
} from '@expo-google-fonts/raleway';
import {
  Nunito_400Regular,
  Nunito_700Bold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  OpenSans_400Regular,
  OpenSans_700Bold,
} from '@expo-google-fonts/open-sans';
import {
  MPLUS1p_400Regular,
  MPLUS1p_700Bold,
  MPLUS1p_900Black,
} from '@expo-google-fonts/m-plus-1p';
import {
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_900Black,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { SawarabiGothic_400Regular } from '@expo-google-fonts/sawarabi-gothic';
import { SawarabiMincho_400Regular } from '@expo-google-fonts/sawarabi-mincho';
import { KosugiMaru_400Regular } from '@expo-google-fonts/kosugi-maru';
import { DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import {
  ZenKakuGothicNew_400Regular,
  ZenKakuGothicNew_700Bold,
  ZenKakuGothicNew_900Black,
} from '@expo-google-fonts/zen-kaku-gothic-new';
import {
  BIZUDPGothic_400Regular,
  BIZUDPGothic_700Bold,
} from '@expo-google-fonts/biz-udpgothic';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import {
  Merriweather_400Regular,
  Merriweather_700Bold,
  Merriweather_900Black,
} from '@expo-google-fonts/merriweather';
import { useEditorStore } from '@/stores/useEditorStore';
import { VideoOverlay } from './VideoOverlay';
import type { FrameId, FrameScreenType } from '@/stores/useEditorStore';
import type { Layer } from '@/types';

// ─── Frame image assets ──────────────────────────────────────────────────────
// Static require (Metro requires static path at bundle time)
const FRAME_IMAGE_IPHONE = require('../../../assets/frame_img.png');

// Hardcoded screen pixel bounds for frames where runtime detection is unreliable.
// Values derived from direct pixel analysis of the PNG files.
//   frame_img.png  (1017×1680): white opaque screen at x=228–808, y=216–1463
//   frame_img2.png (1050×1934): transparent screen — reliable via center-outward scan
const FRAME_HARDCODED_BOUNDS: Partial<Record<FrameId, {
  minX: number; minY: number; maxX: number; maxY: number;
  type: 'opaque' | 'transparent';
}>> = {
  'iphone': { minX: 228, minY: 216, maxX: 808, maxY: 1463, type: 'opaque' },
};

// ─── Canvas (public) ────────────────────────────────────────────────────────

interface CanvasProps {
  dragOffsetX: SharedValue<number>;
  dragOffsetY: SharedValue<number>;
  pinchScale:  SharedValue<number>;
}

export function Canvas({ dragOffsetX, dragOffsetY, pinchScale }: CanvasProps) {
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth  = screenWidth;
  const canvasHeight = screenWidth * 1.5;

  const canvasRef          = useCanvasRef();
  const setCanvasRef       = useEditorStore((s) => s.setCanvasRef);
  const background         = useEditorStore((s) => s.background);
  const layers             = useEditorStore((s) => s.layers);
  const selectedFrameId    = useEditorStore((s) => s.selectedFrameId);
  const frameEnabled       = selectedFrameId !== 'none';
  const frameScreenRect    = useEditorStore((s) => s.frameScreenRect);
  const setFrameScreenRect = useEditorStore((s) => s.setFrameScreenRect);
  const selectedLayerId    = useEditorStore((s) => s.selectedLayerId);
  const frameScreenType    = useEditorStore((s) => s.frameScreenType);
  const frameScale         = useEditorStore((s) => s.frameScale);

  const frameImage = useImage(FRAME_IMAGE_IPHONE);

  // Compute how to draw the frame image on the canvas (uniform fit, centered, scaled by frameScale)
  const frameLayout = useMemo(() => {
    if (!frameImage) return null;
    const imgW = frameImage.width();
    const imgH = frameImage.height();
    const baseScale  = Math.min(canvasWidth / imgW, canvasHeight / imgH);
    const scale      = baseScale * frameScale;
    const drawWidth  = imgW * scale;
    const drawHeight = imgH * scale;
    const drawX = (canvasWidth  - drawWidth)  / 2;
    const drawY = (canvasHeight - drawHeight) / 2;
    return { drawX, drawY, drawWidth, drawHeight, scale, imgW, imgH };
  }, [frameImage, canvasWidth, canvasHeight, frameScale]);

  // Detected screen bounds in image-pixel coordinates.
  // Recompute canvas-space screenRect whenever layout or frame changes.
  // Uses hardcoded pixel bounds for 'iphone' (no pixel scanning needed).
  useEffect(() => {
    if (!frameEnabled || !frameLayout) {
      setFrameScreenRect(null, null);
      return;
    }
    const { drawX, drawY, scale } = frameLayout;
    const hardcoded = FRAME_HARDCODED_BOUNDS[selectedFrameId];
    if (!hardcoded) {
      setFrameScreenRect(null, null);
      return;
    }
    const { minX, minY, maxX, maxY, type } = hardcoded;
    setFrameScreenRect({
      x:      drawX + minX * scale,
      y:      drawY + minY * scale,
      width:  (maxX - minX + 1) * scale,
      height: (maxY - minY + 1) * scale,
    }, type);
  }, [frameLayout, frameEnabled, selectedFrameId]);

  useEffect(() => { setCanvasRef(canvasRef); }, [canvasRef]);

  const screenRect = frameEnabled ? frameScreenRect : null;

  return (
    <View style={{ width: canvasWidth, height: canvasHeight }}>

      {/* Skia: background → image layers → frame PNG → text layers */}
      <SkiaCanvas ref={canvasRef} style={{ width: canvasWidth, height: canvasHeight }}>
        {/* Background */}
        {background.type === 'solid' && (
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} color={background.color ?? '#ffffff'} />
        )}
        {background.type === 'gradient' && background.gradient && (
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(canvasWidth, canvasHeight)}
              colors={background.gradient.colors}
            />
          </Rect>
        )}
        {background.type === 'image' && background.imageUri && (
          <BackgroundImageRenderer uri={background.imageUri} width={canvasWidth} height={canvasHeight} />
        )}

        {/* Frame PNG first — bezel area is opaque, screen area is transparent cutout */}
        {frameEnabled && frameImage && frameLayout && (
          <Image
            image={frameImage}
            x={frameLayout.drawX}
            y={frameLayout.drawY}
            width={frameLayout.drawWidth}
            height={frameLayout.drawHeight}
            fit="fill"
          />
        )}

        {/* Image layers — drawn on top of frame, visible through the transparent screen area */}
        {layers.filter((l) => l.type !== 'text').map((layer) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            screenRect={screenRect}
            frameScreenType={frameScreenType}
            isSelected={layer.id === selectedLayerId}
            dragOffsetX={dragOffsetX}
            dragOffsetY={dragOffsetY}
            pinchScale={pinchScale}
          />
        ))}

        {/* Text layers — on top of everything */}
        {layers.filter((l) => l.type === 'text').map((layer) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            screenRect={screenRect}
            frameScreenType={frameScreenType}
            isSelected={layer.id === selectedLayerId}
            dragOffsetX={dragOffsetX}
            dragOffsetY={dragOffsetY}
            pinchScale={pinchScale}
          />
        ))}
      </SkiaCanvas>

      {/* Video overlay: rendered on top of Skia canvas */}
      <VideoOverlay />

    </View>
  );
}

// ─── Background Image ─────────────────────────────────────────────────────────

function BackgroundImageRenderer({ uri, width, height }: { uri: string; width: number; height: number }) {
  const bgImage = useImage(uri);
  if (!bgImage) return null;
  return <Image image={bgImage} x={0} y={0} width={width} height={height} fit="cover" />;
}

// ─── LayerRenderer ───────────────────────────────────────────────────────────

type ScreenRect = { x: number; y: number; width: number; height: number };

interface LayerRendererProps {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  screenRect: ScreenRect | null;
  frameScreenType: FrameScreenType;
  isSelected: boolean;
  dragOffsetX: SharedValue<number>;
  dragOffsetY: SharedValue<number>;
  pinchScale:  SharedValue<number>;
}

function LayerRenderer(props: LayerRendererProps) {
  if (props.layer.type === 'text') {
    return <TextLayerRenderer {...props} />;
  }
  if (props.layer.type === 'image') {
    return <ImageLayerRenderer {...props} />;
  }
  return null;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function charPxWidth(ch: string, fontSize: number): number {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp >= 0x1100) return fontSize;
  return fontSize * 0.55;
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const lines: string[] = [];
  let line = '';
  let lineW = 0;
  for (const ch of text) {
    const cw = charPxWidth(ch, fontSize);
    if (lineW + cw > maxWidth && line.length > 0) {
      lines.push(line);
      line = ch;
      lineW = cw;
    } else {
      line += ch;
      lineW += cw;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines.length > 0 ? lines : [''];
}

function linePxWidth(line: string, fontSize: number): number {
  return [...line].reduce((sum, ch) => sum + charPxWidth(ch, fontSize), 0);
}

// ─── Text Layer ──────────────────────────────────────────────────────────────

const SELECTION_COLOR = 'rgba(43,140,238,0.9)';

const ROBOTO_REGULAR = require('../../../assets/fonts/Roboto-Regular.ttf');

const FONT_MAP: Record<string, Record<string, unknown>> = {
  'noto-sans-jp': {
    normal: NotoSansJP_400Regular,
    bold:   NotoSansJP_700Bold,
    black:  NotoSansJP_900Black,
  },
  'noto-serif-jp': {
    normal: NotoSerifJP_400Regular,
    bold:   NotoSerifJP_700Bold,
    black:  NotoSerifJP_900Black,
  },
  'roboto': {
    normal: ROBOTO_REGULAR,
    bold:   ROBOTO_REGULAR,
    black:  ROBOTO_REGULAR,
  },
  'inter': {
    normal: Inter_400Regular,
    bold:   Inter_700Bold,
    black:  Inter_900Black,
  },
  'lato': {
    normal: Lato_400Regular,
    bold:   Lato_700Bold,
    black:  Lato_900Black,
  },
  'montserrat': {
    normal: Montserrat_400Regular,
    bold:   Montserrat_700Bold,
    black:  Montserrat_900Black,
  },
  'oswald': {
    normal: Oswald_400Regular,
    bold:   Oswald_700Bold,
    black:  Oswald_700Bold,
  },
  'raleway': {
    normal: Raleway_400Regular,
    bold:   Raleway_700Bold,
    black:  Raleway_900Black,
  },
  'nunito': {
    normal: Nunito_400Regular,
    bold:   Nunito_700Bold,
    black:  Nunito_900Black,
  },
  'open-sans': {
    normal: OpenSans_400Regular,
    bold:   OpenSans_700Bold,
    black:  OpenSans_700Bold,
  },
  'm-plus-1p': {
    normal: MPLUS1p_400Regular,
    bold:   MPLUS1p_700Bold,
    black:  MPLUS1p_900Black,
  },
  'm-plus-r': {
    normal: MPLUSRounded1c_400Regular,
    bold:   MPLUSRounded1c_700Bold,
    black:  MPLUSRounded1c_900Black,
  },
  'biz-ud': {
    normal: BIZUDPGothic_400Regular,
    bold:   BIZUDPGothic_700Bold,
    black:  BIZUDPGothic_700Bold,
  },
  'zen-kaku': {
    normal: ZenKakuGothicNew_400Regular,
    bold:   ZenKakuGothicNew_700Bold,
    black:  ZenKakuGothicNew_900Black,
  },
  'sawarabi-g': {
    normal: SawarabiGothic_400Regular,
    bold:   SawarabiGothic_400Regular,
    black:  SawarabiGothic_400Regular,
  },
  'sawarabi-m': {
    normal: SawarabiMincho_400Regular,
    bold:   SawarabiMincho_400Regular,
    black:  SawarabiMincho_400Regular,
  },
  'kosugi-m': {
    normal: KosugiMaru_400Regular,
    bold:   KosugiMaru_400Regular,
    black:  KosugiMaru_400Regular,
  },
  'dot-gothic': {
    normal: DotGothic16_400Regular,
    bold:   DotGothic16_400Regular,
    black:  DotGothic16_400Regular,
  },
  'playfair': {
    normal: PlayfairDisplay_400Regular,
    bold:   PlayfairDisplay_700Bold,
    black:  PlayfairDisplay_900Black,
  },
  'merriweather': {
    normal: Merriweather_400Regular,
    bold:   Merriweather_700Bold,
    black:  Merriweather_900Black,
  },
};

function TextLayerRenderer({ layer, canvasWidth, canvasHeight, isSelected, dragOffsetX, dragOffsetY, pinchScale }: LayerRendererProps) {
  const fontSize   = layer.size.height || 24;
  const familyMap  = FONT_MAP[layer.fontFamily ?? 'noto-sans-jp'] ?? FONT_MAP['noto-sans-jp'];
  const fontAsset  = familyMap[layer.fontWeight ?? 'normal'] as Parameters<typeof useFont>[0];
  const font       = useFont(fontAsset, fontSize);

  const lineHeight    = fontSize * 1.35;
  const maxTextWidth  = canvasWidth * 0.85;
  const lines         = wrapText(layer.uri, maxTextWidth, fontSize);

  const blockCX    = canvasWidth  / 2 + layer.position.x;
  const firstBaseY = canvasHeight / 2 + layer.position.y;

  // Selection bounding box
  const maxLineW = lines.length > 0 ? Math.max(...lines.map((l) => linePxWidth(l, fontSize))) : 0;
  const SEL_PAD  = 6;
  const selX = blockCX - maxLineW / 2 - SEL_PAD;
  const selY = firstBaseY - fontSize - SEL_PAD;
  const selW = maxLineW + SEL_PAD * 2;
  const selH = (lines.length - 1) * lineHeight + fontSize * 1.3 + SEL_PAD * 2;

  const dragTransform = useDerivedValue(() => [
    { translateX: isSelected ? dragOffsetX.value : 0 },
    { translateY: isSelected ? dragOffsetY.value : 0 },
  ]);

  const pivotOrigin = useDerivedValue(() => ({
    x: blockCX    + (isSelected ? dragOffsetX.value : 0),
    y: firstBaseY - fontSize / 2 + (isSelected ? dragOffsetY.value : 0),
  }));
  const pinchTransform = useDerivedValue(() =>
    isSelected ? [{ scale: pinchScale.value }] : []
  );

  if (!font) return null;

  return (
    <Group opacity={layer.opacity} origin={pivotOrigin} transform={pinchTransform}>
      <Group transform={dragTransform}>
        {isSelected && (
          <Rect x={selX} y={selY} width={selW} height={selH} color={SELECTION_COLOR} style="stroke" strokeWidth={1.5} />
        )}
        {lines.map((line, i) => {
          const lw = linePxWidth(line, fontSize);
          const lx = blockCX - lw / 2;
          const ly = firstBaseY + i * lineHeight;
          return (
            <Group key={i}>
              {layer.shadow.enabled && (
                <SkiaText
                  x={lx + layer.shadow.offsetX}
                  y={ly + layer.shadow.offsetY}
                  text={line}
                  font={font}
                  color={`rgba(0,0,0,${layer.shadow.opacity})`}
                />
              )}
              <SkiaText x={lx} y={ly} text={line} font={font} color={layer.textColor ?? '#ffffff'} />
            </Group>
          );
        })}
      </Group>
    </Group>
  );
}

// ─── Image Layer ─────────────────────────────────────────────────────────────

function ImageLayerRenderer({ layer, canvasWidth, canvasHeight, screenRect, frameScreenType, isSelected, dragOffsetX, dragOffsetY, pinchScale }: LayerRendererProps) {
  const image = useImage(layer.uri);

  const hasCrop = layer.cropX !== undefined && layer.cropW !== undefined && layer.cropH !== undefined;

  // Native image dimensions (use 1 as fallback to avoid division by zero)
  const imgNativeW = image?.width()  ?? 1;
  const imgNativeH = image?.height() ?? 1;

  // Compute draw rect in canvas coordinates
  let drawX: number, drawY: number, drawW: number, drawH: number;

  if (hasCrop && screenRect) {
    // Cover scale: take the larger of width/height scale so no gap is possible
    const scaleX = screenRect.width  / layer.cropW!;
    const scaleY = screenRect.height / layer.cropH!;
    const effectiveScale = Math.max(scaleX, scaleY);
    drawW = imgNativeW * effectiveScale;
    drawH = imgNativeH * effectiveScale;
    // Align crop-region center to screen-rect center
    const cropCenterX = layer.cropX! + layer.cropW! / 2;
    const cropCenterY = layer.cropY! + layer.cropH! / 2;
    drawX = (screenRect.x + screenRect.width  / 2) - cropCenterX * effectiveScale;
    drawY = (screenRect.y + screenRect.height / 2) - cropCenterY * effectiveScale;
  } else if (screenRect) {
    // Fallback: fill screenRect with cover
    drawX = screenRect.x;
    drawY = screenRect.y;
    drawW = screenRect.width;
    drawH = screenRect.height;
  } else {
    // No frame — fit image within 90% of canvas, centered, draggable
    const ar = (layer.size.width || 1) / (layer.size.height || 1);
    const mw = canvasWidth * 0.9, mh = canvasHeight * 0.9;
    if (ar >= mw / mh) {
      drawW = mw; drawH = mw / ar;
    } else {
      drawH = mh; drawW = mh * ar;
    }
    drawX = (canvasWidth  - drawW) / 2 + layer.position.x;
    drawY = (canvasHeight - drawH) / 2 + layer.position.y;
  }

  // Whether interactive drag/pinch is supported (only for free-floating layers)
  const interactiveMode = !hasCrop && !screenRect;

  // Hooks (always unconditional)
  const dragTransform = useDerivedValue(() => [
    { translateX: isSelected && interactiveMode ? dragOffsetX.value : 0 },
    { translateY: isSelected && interactiveMode ? dragOffsetY.value : 0 },
  ]);

  const scaleOrigin = useDerivedValue(() => ({
    x: drawX + drawW / 2,
    y: drawY + drawH / 2,
  }));

  const scaleTransform = useDerivedValue(() =>
    isSelected && interactiveMode ? [{ scale: pinchScale.value }] : []
  );

  // Rounded rect clip matching the iPhone screen's corner radius
  const clip = useMemo(() => {
    if (!screenRect) return undefined;
    const cr = screenRect.width * 0.11;
    return Skia.RRectXY(
      Skia.XYWHRect(screenRect.x, screenRect.y, screenRect.width, screenRect.height),
      cr, cr,
    );
  }, [screenRect]);

  if (!image) return null;

  const fitMode = hasCrop ? 'fill' : 'cover';

  return (
    <Group clip={clip}>
      <Group opacity={layer.opacity} origin={scaleOrigin} transform={scaleTransform}>
        <Group transform={dragTransform}>
          <Image image={image} x={drawX} y={drawY} width={drawW} height={drawH} fit={fitMode} />
          {isSelected && (
            <Rect x={drawX} y={drawY} width={drawW} height={drawH} color={SELECTION_COLOR} style="stroke" strokeWidth={1.5} />
          )}
        </Group>
      </Group>
    </Group>
  );
}
