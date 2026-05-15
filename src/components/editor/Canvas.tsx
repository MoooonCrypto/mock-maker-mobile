import { useEffect, useMemo } from 'react';
import { View, PixelRatio } from 'react-native';
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
import type { FrameId } from '@/stores/useEditorStore';
import { STICKER_ASSETS } from '@/constants/stickers';
import type { Layer } from '@/types';
import type { MediaSceneLayer } from '@/utils/mediaScene';
import { buildMediaScene } from '@/utils/mediaScene';
import { hasMediaCrop } from '@/utils/mediaCrop';
import { computeFramePresentation } from '@/utils/frameRects';
import { getLogicalCanvasSize } from '@/utils/canvasMetrics';

// ─── Frame image assets ──────────────────────────────────────────────────────
const FRAME_IMAGE_IPHONE = require('../../../assets/frame_img.png');

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
  const templateId = useEditorStore((s) => s.templateId);
  const canvasPresetId = useEditorStore((s) => s.canvasPresetId);
  const pixelRatio = PixelRatio.get();
  const { canvasWidth, canvasHeight } = getLogicalCanvasSize(canvasPresetId, templateId, pixelRatio);

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

  const canvasRef    = useCanvasRef();
  const setCanvasRef = useEditorStore((s) => s.setCanvasRef);
  const background         = useEditorStore((s) => s.background);
  const layers             = useEditorStore((s) => s.layers);
  const selectedFrameId    = useEditorStore((s) => s.selectedFrameId);
  const selectedLayerId    = useEditorStore((s) => s.selectedLayerId);
  const frameScale         = useEditorStore((s) => s.frameScale);
  const framePosition      = useEditorStore((s) => s.framePosition);

  const frameImage = useImage(FRAME_IMAGE_IPHONE);
  const framePresentation = useMemo(
    () =>
      computeFramePresentation({
        templateId,
        selectedFrameId,
        frameScale,
        framePosition,
        canvasPresetId,
        pixelRatio,
      }),
    [canvasPresetId, framePosition, frameScale, pixelRatio, selectedFrameId, templateId]
  );

  useEffect(() => { setCanvasRef(canvasRef); }, [canvasRef]);
  const mediaScene = useMemo(
    () =>
      buildMediaScene({
        layers,
        templateId,
        selectedFrameId,
        frameScale,
        framePosition,
        canvasPresetId,
        pixelRatio,
        canvasWidth,
        canvasHeight,
      }),
    [canvasHeight, canvasPresetId, canvasWidth, framePosition, frameScale, layers, pixelRatio, selectedFrameId, templateId]
  );
  const mediaSceneByLayerId = useMemo(
    () => new Map(mediaScene.map((item) => [item.layer.id, item])),
    [mediaScene]
  );

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

        {/* Single/top-half/split: iPhone frame PNG */}
        {selectedFrameId === 'iphone' && frameImage && framePresentation.primaryFrame && templateId !== 'double' && (
          <Group origin={framePinchOrigin} transform={framePinchTransform}>
            <Group transform={frameDragTransform}>
              <Group clip={Skia.XYWHRect(0, 0, canvasWidth, canvasHeight)}>
                <Image
                  image={frameImage}
                  x={framePresentation.primaryFrame.x}
                  y={framePresentation.primaryFrame.y}
                  width={framePresentation.primaryFrame.width}
                  height={framePresentation.primaryFrame.height}
                  fit="fill"
                />
              </Group>
            </Group>
          </Group>
        )}

        {/* Double template: two iPhone frames */}
        {templateId === 'double' && frameImage && framePresentation.primaryFrame && framePresentation.secondaryFrame && (
          <Group origin={framePinchOrigin} transform={framePinchTransform}>
            <Group transform={frameDragTransform}>
              <Image
                image={frameImage}
                x={framePresentation.primaryFrame.x}
                y={framePresentation.primaryFrame.y}
                width={framePresentation.primaryFrame.width}
                height={framePresentation.primaryFrame.height}
                fit="fill"
              />
              <Image
                image={frameImage}
                x={framePresentation.secondaryFrame.x}
                y={framePresentation.secondaryFrame.y}
                width={framePresentation.secondaryFrame.width}
                height={framePresentation.secondaryFrame.height}
                fit="fill"
              />
            </Group>
          </Group>
        )}

        {/* App-icon frame — rounded rect border + shadow */}
        {selectedFrameId === 'app-icon' && framePresentation.appIconFrame && (
          <Group origin={framePinchOrigin} transform={framePinchTransform}>
            <Group transform={frameDragTransform}>
              {/* Drop shadow */}
              <RoundedRect
                x={framePresentation.appIconFrame.x}
                y={framePresentation.appIconFrame.y}
                width={framePresentation.appIconFrame.size}
                height={framePresentation.appIconFrame.size}
                r={framePresentation.appIconFrame.cornerRadius}
              >
                <Shadow dx={0} dy={4} blur={20} color="rgba(0,0,0,0.30)" />
                <Paint color="transparent" />
              </RoundedRect>
              {/* Border */}
              <RoundedRect
                x={framePresentation.appIconFrame.x}
                y={framePresentation.appIconFrame.y}
                width={framePresentation.appIconFrame.size}
                height={framePresentation.appIconFrame.size}
                r={framePresentation.appIconFrame.cornerRadius}
                style="stroke"
                strokeWidth={2}
                color="rgba(148,163,184,0.8)"
              />
            </Group>
          </Group>
        )}

        {/* Image layers — clipped to screen rect */}
        {layers.filter((l) => l.type === 'image').map((layer) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            sceneItem={mediaSceneByLayerId.get(layer.id)}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            isSelected={layer.id === selectedLayerId}
            dragOffsetX={dragOffsetX}
            dragOffsetY={dragOffsetY}
            pinchScale={pinchScale}
          />
        ))}

        {/* Text layers */}
        {layers.filter((l) => l.type === 'text').map((layer) => (
          <LayerRenderer
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

        {/* Sticker layers */}
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

      {/* Split template: center divider (overlay, not in snapshot) */}
      {templateId === 'split' && (
        <View style={{
          position: 'absolute',
          left: canvasWidth / 2 - 1,
          top: 0,
          width: 2,
          height: canvasHeight,
          backgroundColor: 'rgba(255,255,255,0.55)',
        }} pointerEvents="none" />
      )}

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

interface LayerRendererProps {
  layer: Layer;
  sceneItem?: MediaSceneLayer;
  canvasWidth: number;
  canvasHeight: number;
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
          <Rect x={drawX} y={drawY} width={drawW} height={drawH} color={SELECTION_COLOR} style="stroke" strokeWidth={2} />
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
          <Rect x={selX} y={selY} width={selW} height={selH} color={SELECTION_COLOR} style="stroke" strokeWidth={2} />
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

function ImageLayerRenderer({ layer, sceneItem, isSelected, dragOffsetX, dragOffsetY, pinchScale }: LayerRendererProps) {
  const image = useImage(layer.uri);

  const hasCrop = hasMediaCrop(layer);
  const activeScreenRect = sceneItem?.isFramed ? sceneItem.targetRect : null;
  const drawRect = sceneItem?.drawRect ?? { x: 0, y: 0, width: 0, height: 0 };
  const drawX = drawRect.x;
  const drawY = drawRect.y;
  const drawW = drawRect.width;
  const drawH = drawRect.height;
  const interactiveMode = !hasCrop && !sceneItem?.isFramed;

  const dragTransform = useDerivedValue(() => [
    { translateX: isSelected && interactiveMode ? dragOffsetX.value : 0 },
    { translateY: isSelected && interactiveMode ? dragOffsetY.value : 0 },
  ]);

  const scaleOrigin = useDerivedValue(() => ({
    x: (activeScreenRect ? activeScreenRect.x + activeScreenRect.width  / 2 : drawX + drawW / 2),
    y: (activeScreenRect ? activeScreenRect.y + activeScreenRect.height / 2 : drawY + drawH / 2),
  }));

  const scaleTransform = useDerivedValue(() =>
    isSelected && interactiveMode ? [{ scale: pinchScale.value }] : []
  );

  if (!image) return null;

  const selX = activeScreenRect ? activeScreenRect.x : drawX;
  const selY = activeScreenRect ? activeScreenRect.y : drawY;
  const selW = activeScreenRect ? activeScreenRect.width  : drawW;
  const selH = activeScreenRect ? activeScreenRect.height : drawH;

  const cr = activeScreenRect ? (sceneItem?.cornerRadius ?? 0) : 0;
  const clipRRect = activeScreenRect
    ? Skia.RRectXY(
        Skia.XYWHRect(activeScreenRect.x, activeScreenRect.y, activeScreenRect.width, activeScreenRect.height),
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
        {isSelected && !activeScreenRect && (
          <Rect x={selX} y={selY} width={selW} height={selH} color={SELECTION_COLOR} style="stroke" strokeWidth={1.5} />
        )}
      </Group>
    </Group>
  );
}
