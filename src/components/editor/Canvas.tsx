import { useEffect, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Canvas as SkiaCanvas,
  useCanvasRef,
  Rect,
  RoundedRect,
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
import { STICKER_ASSETS } from '@/constants/stickers';
import type { Layer } from '@/types';

// ─── Frame image assets ──────────────────────────────────────────────────────
const FRAME_IMAGE_IPHONE = require('../../../assets/frame_img.png');

// Hardcoded screen pixel bounds for the iPhone frame PNG.
//   frame_img.png (1017×1680): opaque screen at x=228–808, y=216–1463
const FRAME_HARDCODED_BOUNDS: Partial<Record<FrameId, {
  minX: number; minY: number; maxX: number; maxY: number;
  type: 'opaque' | 'transparent';
}>> = {
  'iphone': { minX: 228, minY: 216, maxX: 808, maxY: 1463, type: 'opaque' },
};

// Corner radius ratio per frame type (fraction of screenRect.width)
function frameClipCornerRatio(frameId: FrameId): number {
  if (frameId === 'app-icon') return 0.22;
  return 0.11; // iphone
}

// ─── Canvas (public) ────────────────────────────────────────────────────────

interface CanvasProps {
  dragOffsetX: SharedValue<number>;
  dragOffsetY: SharedValue<number>;
  pinchScale:  SharedValue<number>;
  frameDragX:  SharedValue<number>;
  frameDragY:  SharedValue<number>;
  framePinchS: SharedValue<number>;
}

export function Canvas({ dragOffsetX, dragOffsetY, pinchScale, frameDragX, frameDragY, framePinchS }: CanvasProps) {
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth  = screenWidth;

  // Register all fonts as RN font families so TextEditPanel preview can use them
  useFonts({
    NotoSansJP_400Regular,    NotoSansJP_700Bold,
    NotoSerifJP_400Regular,   NotoSerifJP_700Bold,
    MPLUS1p_400Regular,       MPLUS1p_700Bold,
    MPLUSRounded1c_400Regular, MPLUSRounded1c_700Bold,
    BIZUDPGothic_400Regular,  BIZUDPGothic_700Bold,
    ZenKakuGothicNew_400Regular, ZenKakuGothicNew_700Bold,
    SawarabiGothic_400Regular,
    SawarabiMincho_400Regular,
    KosugiMaru_400Regular,
    DotGothic16_400Regular,
    Inter_400Regular,         Inter_700Bold,
    Montserrat_400Regular,    Montserrat_700Bold,
    Lato_400Regular,          Lato_700Bold,
    OpenSans_400Regular,      OpenSans_700Bold,
    Oswald_400Regular,        Oswald_700Bold,
    Raleway_400Regular,       Raleway_700Bold,
    Nunito_400Regular,        Nunito_700Bold,
    PlayfairDisplay_400Regular, PlayfairDisplay_700Bold,
    Merriweather_400Regular,  Merriweather_700Bold,
    Roboto: require('../../../assets/fonts/Roboto-Regular.ttf'),
  } as any);
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
  const framePosition      = useEditorStore((s) => s.framePosition);

  const frameImage = useImage(FRAME_IMAGE_IPHONE);

  // iPhone frame layout (uniform fit, centered, with position offset)
  const frameLayout = useMemo(() => {
    if (!frameImage || selectedFrameId !== 'iphone') return null;
    const imgW = frameImage.width();
    const imgH = frameImage.height();
    const baseScale  = Math.min(canvasWidth / imgW, canvasHeight / imgH);
    const scale      = baseScale * frameScale;
    const drawWidth  = imgW * scale;
    const drawHeight = imgH * scale;
    const drawX = (canvasWidth  - drawWidth)  / 2 + framePosition.x;
    const drawY = (canvasHeight - drawHeight) / 2 + framePosition.y;
    return { drawX, drawY, drawWidth, drawHeight, scale, imgW, imgH };
  }, [frameImage, canvasWidth, canvasHeight, frameScale, framePosition, selectedFrameId]);

  // App-icon frame layout (square, centered, with position offset)
  const appIconLayout = useMemo(() => {
    if (selectedFrameId !== 'app-icon') return null;
    const size = Math.min(canvasWidth, canvasHeight) * 0.55 * frameScale;
    const x = (canvasWidth  - size) / 2 + framePosition.x;
    const y = (canvasHeight - size) / 2 + framePosition.y;
    const cr = size * 0.22;
    return { x, y, size, cr };
  }, [selectedFrameId, canvasWidth, canvasHeight, frameScale, framePosition]);

  // Update frameScreenRect whenever frame layout changes
  useEffect(() => {
    if (!frameEnabled) {
      setFrameScreenRect(null, null);
      return;
    }

    if (selectedFrameId === 'app-icon' && appIconLayout) {
      setFrameScreenRect({
        x: appIconLayout.x,
        y: appIconLayout.y,
        width: appIconLayout.size,
        height: appIconLayout.size,
      }, 'transparent');
      return;
    }

    if (frameLayout) {
      const { drawX, drawY, scale } = frameLayout;
      const hardcoded = FRAME_HARDCODED_BOUNDS[selectedFrameId];
      if (!hardcoded) { setFrameScreenRect(null, null); return; }
      const { minX, minY, maxX, maxY, type } = hardcoded;
      setFrameScreenRect({
        x:      drawX + minX * scale,
        y:      drawY + minY * scale,
        width:  (maxX - minX + 1) * scale,
        height: (maxY - minY + 1) * scale,
      }, type);
    }
  }, [frameLayout, appIconLayout, frameEnabled, selectedFrameId]);

  useEffect(() => { setCanvasRef(canvasRef); }, [canvasRef]);

  // Compute screenRect directly for rendering — app-icon uses appIconLayout directly
  // to avoid store update timing issues. iPhone frame uses the stored rect (pixel-detected).
  const screenRect = useMemo(() => {
    if (!frameEnabled) return null;
    if (selectedFrameId === 'app-icon' && appIconLayout) {
      return {
        x: appIconLayout.x,
        y: appIconLayout.y,
        width:  appIconLayout.size,
        height: appIconLayout.size,
      };
    }
    return frameScreenRect;
  }, [frameEnabled, selectedFrameId, appIconLayout, frameScreenRect]);

  const clipCrRatio = frameClipCornerRatio(selectedFrameId);

  // Frame drag/pinch transforms (applied as Group transform on the frame)
  const frameDragTransform = useDerivedValue(() => [
    { translateX: frameDragX.value },
    { translateY: frameDragY.value },
  ]);

  const framePinchOrigin = useDerivedValue(() => ({
    x: canvasWidth  / 2 + framePosition.x + frameDragX.value,
    y: canvasHeight / 2 + framePosition.y + frameDragY.value,
  }));
  const framePinchTransform = useDerivedValue(() => [{ scale: framePinchS.value }]);

  return (
    <View style={{ width: canvasWidth, height: canvasHeight }}>

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

        {/* iPhone frame PNG — drawn FIRST; screen area is opaque white, bezel is transparent */}
        {selectedFrameId === 'iphone' && frameImage && frameLayout && (
          <Group origin={framePinchOrigin} transform={framePinchTransform}>
            <Group transform={frameDragTransform}>
              <Image
                image={frameImage}
                x={frameLayout.drawX}
                y={frameLayout.drawY}
                width={frameLayout.drawWidth}
                height={frameLayout.drawHeight}
                fit="fill"
              />
            </Group>
          </Group>
        )}

        {/* App-icon frame — rounded rect border + shadow */}
        {selectedFrameId === 'app-icon' && appIconLayout && (
          <Group origin={framePinchOrigin} transform={framePinchTransform}>
            <Group transform={frameDragTransform}>
              {/* Drop shadow */}
              <RoundedRect
                x={appIconLayout.x}
                y={appIconLayout.y}
                width={appIconLayout.size}
                height={appIconLayout.size}
                r={appIconLayout.cr}
              >
                <Shadow dx={0} dy={4} blur={20} color="rgba(0,0,0,0.30)" />
                <Paint color="transparent" />
              </RoundedRect>
              {/* Border */}
              <RoundedRect
                x={appIconLayout.x}
                y={appIconLayout.y}
                width={appIconLayout.size}
                height={appIconLayout.size}
                r={appIconLayout.cr}
                style="stroke"
                strokeWidth={2}
                color="rgba(148,163,184,0.8)"
              />
            </Group>
          </Group>
        )}

        {/* Image/video layers — drawn AFTER frame; Group clip confines image to screenRect */}
        {layers.filter((l) => l.type !== 'text' && l.type !== 'sticker').map((layer) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            screenRect={screenRect}
            frameScreenType={frameScreenType}
            clipCrRatio={clipCrRatio}
            isSelected={layer.id === selectedLayerId}
            dragOffsetX={dragOffsetX}
            dragOffsetY={dragOffsetY}
            pinchScale={pinchScale}
          />
        ))}

        {/* Text layers — on top of frame */}
        {layers.filter((l) => l.type === 'text').map((layer) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            screenRect={screenRect}
            frameScreenType={frameScreenType}
            clipCrRatio={clipCrRatio}
            isSelected={layer.id === selectedLayerId}
            dragOffsetX={dragOffsetX}
            dragOffsetY={dragOffsetY}
            pinchScale={pinchScale}
          />
        ))}

        {/* Sticker layers — topmost, never clipped */}
        {layers.filter((l) => l.type === 'sticker').map((layer) => (
          <StickerLayerRenderer
            key={layer.id}
            layer={layer}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
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
  clipCrRatio: number;
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

// ─── Sticker Layer ────────────────────────────────────────────────────────────

interface StickerLayerRendererProps {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  isSelected: boolean;
  dragOffsetX: SharedValue<number>;
  dragOffsetY: SharedValue<number>;
  pinchScale:  SharedValue<number>;
}

function StickerLayerRenderer({ layer, canvasWidth, canvasHeight, isSelected, dragOffsetX, dragOffsetY, pinchScale }: StickerLayerRendererProps) {
  const asset = STICKER_ASSETS[layer.uri];
  const image = useImage(asset ?? null);

  const drawW = layer.size.width;
  const drawH = layer.size.height;
  const drawX = canvasWidth  / 2 + layer.position.x - drawW / 2;
  const drawY = canvasHeight / 2 + layer.position.y - drawH / 2;

  const dragTransform = useDerivedValue(() => [
    { translateX: isSelected ? dragOffsetX.value : 0 },
    { translateY: isSelected ? dragOffsetY.value : 0 },
  ]);

  const scaleOrigin = useDerivedValue(() => ({
    x: drawX + drawW / 2 + (isSelected ? dragOffsetX.value : 0),
    y: drawY + drawH / 2 + (isSelected ? dragOffsetY.value : 0),
  }));

  const scaleTransform = useDerivedValue(() =>
    isSelected ? [{ scale: pinchScale.value }] : []
  );

  if (!image) return null;

  return (
    <Group opacity={layer.opacity} origin={scaleOrigin} transform={scaleTransform}>
      <Group transform={dragTransform}>
        <Image image={image} x={drawX} y={drawY} width={drawW} height={drawH} fit="cover" />
        {isSelected && (
          <Rect x={drawX} y={drawY} width={drawW} height={drawH} color={SELECTION_COLOR} style="stroke" strokeWidth={1.5} />
        )}
      </Group>
    </Group>
  );
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
          const ulY = ly + fontSize * 0.12;
          const ulH = Math.max(1, Math.round(fontSize * 0.07));
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
              {layer.underline && (
                <Rect x={lx} y={ulY} width={lw} height={ulH} color={layer.textColor ?? '#ffffff'} />
              )}
            </Group>
          );
        })}
      </Group>
    </Group>
  );
}

// ─── Image Layer ─────────────────────────────────────────────────────────────

function ImageLayerRenderer({ layer, canvasWidth, canvasHeight, screenRect, clipCrRatio, isSelected, dragOffsetX, dragOffsetY, pinchScale }: LayerRendererProps) {
  const image = useImage(layer.uri);

  const hasCrop = layer.cropX !== undefined && layer.cropW !== undefined && layer.cropH !== undefined;

  const imgNativeW = image?.width()  ?? 1;
  const imgNativeH = image?.height() ?? 1;

  let drawX: number, drawY: number, drawW: number, drawH: number;

  if (hasCrop && screenRect) {
    const scaleX = screenRect.width  / layer.cropW!;
    const scaleY = screenRect.height / layer.cropH!;
    const effectiveScale = Math.max(scaleX, scaleY);
    drawW = imgNativeW * effectiveScale;
    drawH = imgNativeH * effectiveScale;
    const cropCenterX = layer.cropX! + layer.cropW! / 2;
    const cropCenterY = layer.cropY! + layer.cropH! / 2;
    drawX = (screenRect.x + screenRect.width  / 2) - cropCenterX * effectiveScale;
    drawY = (screenRect.y + screenRect.height / 2) - cropCenterY * effectiveScale;
  } else if (screenRect) {
    drawX = screenRect.x;
    drawY = screenRect.y;
    drawW = screenRect.width;
    drawH = screenRect.height;
  } else {
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

  const interactiveMode = !hasCrop && !screenRect;

  const dragTransform = useDerivedValue(() => [
    { translateX: isSelected && interactiveMode ? dragOffsetX.value : 0 },
    { translateY: isSelected && interactiveMode ? dragOffsetY.value : 0 },
  ]);

  const scaleOrigin = useDerivedValue(() => ({
    x: (screenRect ? screenRect.x + screenRect.width  / 2 : drawX + drawW / 2),
    y: (screenRect ? screenRect.y + screenRect.height / 2 : drawY + drawH / 2),
  }));

  const scaleTransform = useDerivedValue(() =>
    isSelected && interactiveMode ? [{ scale: pinchScale.value }] : []
  );

  if (!image) return null;

  const selX = screenRect ? screenRect.x : drawX;
  const selY = screenRect ? screenRect.y : drawY;
  const selW = screenRect ? screenRect.width  : drawW;
  const selH = screenRect ? screenRect.height : drawH;

  const cr = screenRect ? screenRect.width * clipCrRatio : 0;
  const clipRRect = screenRect
    ? Skia.RRectXY(
        Skia.XYWHRect(screenRect.x, screenRect.y, screenRect.width, screenRect.height),
        cr, cr
      )
    : null;

  return (
    <Group opacity={layer.opacity} origin={scaleOrigin} transform={scaleTransform}>
      <Group transform={dragTransform}>
        {clipRRect ? (
          <Group clip={clipRRect}>
            <Image image={image} x={drawX} y={drawY} width={drawW} height={drawH} fit={hasCrop ? 'fill' : 'cover'} />
          </Group>
        ) : (
          <Image image={image} x={drawX} y={drawY} width={drawW} height={drawH} fit="cover" />
        )}
        {isSelected && !screenRect && (
          <Rect x={selX} y={selY} width={selW} height={selH} color={SELECTION_COLOR} style="stroke" strokeWidth={1.5} />
        )}
      </Group>
    </Group>
  );
}
