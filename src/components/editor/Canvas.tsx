import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
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
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
  NotoSansJP_400Regular,
  NotoSansJP_700Bold,
  NotoSansJP_900Black,
} from '@expo-google-fonts/noto-sans-jp';
import { useEditorStore } from '@/stores/useEditorStore';
import type { Layer, DeviceFrame } from '@/types';

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

  const canvasRef      = useCanvasRef();
  const setCanvasRef   = useEditorStore((s) => s.setCanvasRef);
  const background     = useEditorStore((s) => s.background);
  const layers         = useEditorStore((s) => s.layers);
  const deviceFrame    = useEditorStore((s) => s.deviceFrame);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);

  useEffect(() => { setCanvasRef(canvasRef); }, [canvasRef]);

  return (
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

      {/* Device Frame */}
      {deviceFrame && (
        <DeviceFrameRenderer frame={deviceFrame} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
      )}

      {/* Layers */}
      {layers.map((layer) => (
        <LayerRenderer
          key={layer.id}
          layer={layer}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          deviceFrame={deviceFrame}
          isSelected={layer.id === selectedLayerId}
          dragOffsetX={dragOffsetX}
          dragOffsetY={dragOffsetY}
          pinchScale={pinchScale}
        />
      ))}
    </SkiaCanvas>
  );
}

// ─── Device Frame ────────────────────────────────────────────────────────────

function DeviceFrameRenderer({
  frame, canvasWidth, canvasHeight,
}: { frame: DeviceFrame; canvasWidth: number; canvasHeight: number }) {
  const { frameRect, screenRect } = getFrameLayout(frame, canvasWidth, canvasHeight);
  const isPhone  = frame.category === 'iphone' || frame.category === 'android';
  const isTablet = frame.category === 'ipad';
  const outerR   = isPhone ? 40 : isTablet ? 24 : 8;
  const innerR   = isPhone ? 32 : isTablet ? 16 : 4;

  return (
    <Group>
      <RoundedRect x={frameRect.x} y={frameRect.y} width={frameRect.width} height={frameRect.height} r={outerR} color="rgba(0,0,0,0.01)">
        <Shadow dx={0} dy={8} blur={24} color="rgba(0,0,0,0.3)" />
      </RoundedRect>
      <RoundedRect x={frameRect.x} y={frameRect.y} width={frameRect.width} height={frameRect.height} r={outerR} color="#1a1a1a" />
      <RoundedRect x={frameRect.x + 1} y={frameRect.y + 1} width={frameRect.width - 2} height={frameRect.height - 2} r={outerR - 1} color="#2a2a2a" />
      <RoundedRect x={screenRect.x} y={screenRect.y} width={screenRect.width} height={screenRect.height} r={innerR} color="#000000" />
      {isPhone && frame.deviceId !== 'iphone-se-3' && (
        <RoundedRect x={screenRect.x + screenRect.width / 2 - 45} y={screenRect.y + 8} width={90} height={28} r={14} color="#1a1a1a" />
      )}
    </Group>
  );
}

// ─── getFrameLayout (exported for VideoOverlay / export screen) ──────────────

export function getFrameLayout(frame: DeviceFrame, canvasWidth: number, canvasHeight: number) {
  const isPhone  = frame.category === 'iphone' || frame.category === 'android';
  const isTablet = frame.category === 'ipad';
  const bezelWidth  = isPhone ? 12 : isTablet ? 16 : 20;
  const bezelTop    = isPhone ? 12 : isTablet ? 16 : 24;
  const bezelBottom = isPhone ? 12 : isTablet ? 16 : 8;

  const aspectRatio    = frame.screenSize.width / frame.screenSize.height;
  const maxScreenH     = canvasHeight * 0.7;
  const maxScreenW     = canvasWidth  * 0.6;
  let screenWidth  = maxScreenW;
  let screenHeight = screenWidth / aspectRatio;
  if (screenHeight > maxScreenH) { screenHeight = maxScreenH; screenWidth = screenHeight * aspectRatio; }

  const frameWidth  = screenWidth  + bezelWidth * 2;
  const frameHeight = screenHeight + bezelTop + bezelBottom;
  const frameX = (canvasWidth  - frameWidth)  / 2;
  const frameY = (canvasHeight - frameHeight) / 2;

  return {
    frameRect:  { x: frameX, y: frameY, width: frameWidth, height: frameHeight },
    screenRect: { x: frameX + bezelWidth, y: frameY + bezelTop, width: screenWidth, height: screenHeight },
    bezelWidth,
  };
}

// ─── LayerRenderer ───────────────────────────────────────────────────────────

interface LayerRendererProps {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  deviceFrame: DeviceFrame | null;
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

// ─── Text Layer ──────────────────────────────────────────────────────────────

const SELECTION_COLOR = 'rgba(43,140,238,0.9)';

const FONT_MAP = {
  normal: NotoSansJP_400Regular,
  bold:   NotoSansJP_700Bold,
  black:  NotoSansJP_900Black,
};

function TextLayerRenderer({ layer, canvasWidth, canvasHeight, isSelected, dragOffsetX, dragOffsetY, pinchScale }: LayerRendererProps) {
  const fontSize    = layer.size.height || 24;
  const fontAsset   = FONT_MAP[layer.fontWeight ?? 'normal'];
  const font        = useFont(fontAsset, fontSize);

  // Approximate text width for centering (Noto Sans JP is roughly 0.55em per char)
  const approxCharW = fontSize * 0.55;
  const baseX = canvasWidth  / 2 + layer.position.x - (layer.uri.length * approxCharW) / 2;
  const baseY = canvasHeight / 2 + layer.position.y;

  // Real-time position via SharedValue — updates on UI thread without React re-render
  const x = useDerivedValue(() => baseX + (isSelected ? dragOffsetX.value : 0));
  const y = useDerivedValue(() => baseY + (isSelected ? dragOffsetY.value : 0));

  // Selection border (top-left corner of text bounding box)
  const pad = 6;
  const bx  = useDerivedValue(() => baseX - pad + (isSelected ? dragOffsetX.value : 0));
  const by  = useDerivedValue(() => baseY - fontSize - pad + (isSelected ? dragOffsetY.value : 0));
  const bw  = layer.uri.length * approxCharW + pad * 2;
  const bh  = fontSize + pad * 2;

  if (!font) return null;

  return (
    <Group opacity={layer.opacity}>
      {/* Selection border */}
      {isSelected && (
        <Rect x={bx} y={by} width={bw} height={bh} color="transparent" style="stroke" strokeWidth={1.5}>
          <Paint color={SELECTION_COLOR} style="stroke" strokeWidth={1.5} />
        </Rect>
      )}
      {/* Shadow */}
      {layer.shadow.enabled && (
        <SkiaText
          x={useDerivedValue(() => x.value + layer.shadow.offsetX)}
          y={useDerivedValue(() => y.value + layer.shadow.offsetY)}
          text={layer.uri}
          font={font}
          color={`rgba(0,0,0,${layer.shadow.opacity})`}
        />
      )}
      {/* Text */}
      <SkiaText
        x={x}
        y={y}
        text={layer.uri}
        font={font}
        color={layer.textColor ?? '#ffffff'}
      />
    </Group>
  );
}

// ─── Image Layer ─────────────────────────────────────────────────────────────

function ImageLayerRenderer({ layer, canvasWidth, canvasHeight, deviceFrame, isSelected, dragOffsetX, dragOffsetY }: LayerRendererProps) {
  const image = useImage(layer.uri);

  let baseX: number, baseY: number, drawWidth: number, drawHeight: number;

  if (deviceFrame) {
    const { screenRect } = getFrameLayout(deviceFrame, canvasWidth, canvasHeight);
    const ar = layer.size.width / layer.size.height;
    drawWidth  = screenRect.width;
    drawHeight = drawWidth / ar;
    if (drawHeight > screenRect.height) { drawHeight = screenRect.height; drawWidth = drawHeight * ar; }
    baseX = screenRect.x + (screenRect.width  - drawWidth)  / 2 + layer.position.x;
    baseY = screenRect.y + (screenRect.height - drawHeight) / 2 + layer.position.y;
  } else {
    const ar = layer.size.width / layer.size.height;
    const mw = canvasWidth * 0.8, mh = canvasHeight * 0.8;
    drawWidth  = mw;
    drawHeight = drawWidth / ar;
    if (drawHeight > mh) { drawHeight = mh; drawWidth = drawHeight * ar; }
    baseX = (canvasWidth  - drawWidth)  / 2 + layer.position.x;
    baseY = (canvasHeight - drawHeight) / 2 + layer.position.y;
  }

  const x = useDerivedValue(() => baseX + (isSelected ? dragOffsetX.value : 0));
  const y = useDerivedValue(() => baseY + (isSelected ? dragOffsetY.value : 0));

  if (!image) return null;

  const r = layer.cornerRadius;
  const hasShadow = layer.shadow.enabled;
  const hasStroke = layer.stroke.enabled && layer.stroke.width > 0;

  return (
    <Group opacity={layer.opacity}>
      {r > 0 ? (
        <>
          <RoundedRect x={x} y={y} width={drawWidth} height={drawHeight} r={r}>
            {hasShadow && <Shadow dx={layer.shadow.offsetX} dy={layer.shadow.offsetY} blur={layer.shadow.blur} color={layer.shadow.color} />}
            <Image image={image} x={x} y={y} width={drawWidth} height={drawHeight} fit="cover" />
          </RoundedRect>
          {hasStroke && (
            <RoundedRect x={x} y={y} width={drawWidth} height={drawHeight} r={r} color="transparent" style="stroke" strokeWidth={layer.stroke.width}>
              <Paint color={layer.stroke.color} style="stroke" strokeWidth={layer.stroke.width} />
            </RoundedRect>
          )}
        </>
      ) : (
        <>
          {hasShadow && (
            <Rect x={x} y={y} width={drawWidth} height={drawHeight}>
              <Shadow dx={layer.shadow.offsetX} dy={layer.shadow.offsetY} blur={layer.shadow.blur} color={layer.shadow.color} />
            </Rect>
          )}
          <Image image={image} x={x} y={y} width={drawWidth} height={drawHeight} fit="cover" />
          {hasStroke && (
            <Rect x={x} y={y} width={drawWidth} height={drawHeight} color="transparent" style="stroke" strokeWidth={layer.stroke.width}>
              <Paint color={layer.stroke.color} style="stroke" strokeWidth={layer.stroke.width} />
            </Rect>
          )}
        </>
      )}
      {/* Selection border */}
      {isSelected && (
        <Rect x={x} y={y} width={drawWidth} height={drawHeight} color="transparent" style="stroke" strokeWidth={1.5}>
          <Paint color={SELECTION_COLOR} style="stroke" strokeWidth={1.5} />
        </Rect>
      )}
    </Group>
  );
}
