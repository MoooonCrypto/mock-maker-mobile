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
  Skia,
} from '@shopify/react-native-skia';
import { useEditorStore } from '@/stores/useEditorStore';
import type { Layer, DeviceFrame } from '@/types';
import { colors } from '@/constants/theme';

export function Canvas() {
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth = screenWidth;
  const canvasHeight = screenWidth * 1.5;

  const canvasRef = useCanvasRef();
  const setCanvasRef = useEditorStore((s) => s.setCanvasRef);
  const background = useEditorStore((s) => s.background);
  const layers = useEditorStore((s) => s.layers);
  const deviceFrame = useEditorStore((s) => s.deviceFrame);

  useEffect(() => {
    setCanvasRef(canvasRef);
  }, [canvasRef]);

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
        <LayerRenderer key={layer.id} layer={layer} canvasWidth={canvasWidth} canvasHeight={canvasHeight} deviceFrame={deviceFrame} />
      ))}
    </SkiaCanvas>
  );
}

function DeviceFrameRenderer({
  frame,
  canvasWidth,
  canvasHeight,
}: {
  frame: DeviceFrame;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const { frameRect, screenRect, bezelWidth } = getFrameLayout(frame, canvasWidth, canvasHeight);

  const isPhone = frame.category === 'iphone' || frame.category === 'android';
  const isTablet = frame.category === 'ipad';
  const outerRadius = isPhone ? 40 : isTablet ? 24 : 8;
  const innerRadius = isPhone ? 32 : isTablet ? 16 : 4;

  return (
    <Group>
      {/* Device body shadow */}
      <RoundedRect
        x={frameRect.x}
        y={frameRect.y}
        width={frameRect.width}
        height={frameRect.height}
        r={outerRadius}
        color="rgba(0,0,0,0.01)"
      >
        <Shadow dx={0} dy={8} blur={24} color="rgba(0,0,0,0.3)" />
      </RoundedRect>

      {/* Device body */}
      <RoundedRect
        x={frameRect.x}
        y={frameRect.y}
        width={frameRect.width}
        height={frameRect.height}
        r={outerRadius}
        color="#1a1a1a"
      />

      {/* Side bezel highlights */}
      <RoundedRect
        x={frameRect.x + 1}
        y={frameRect.y + 1}
        width={frameRect.width - 2}
        height={frameRect.height - 2}
        r={outerRadius - 1}
        color="#2a2a2a"
      />

      {/* Screen area (dark background for when no image is loaded) */}
      <RoundedRect
        x={screenRect.x}
        y={screenRect.y}
        width={screenRect.width}
        height={screenRect.height}
        r={innerRadius}
        color="#000000"
      />

      {/* Dynamic Island / Notch for iPhones */}
      {isPhone && frame.deviceId !== 'iphone-se-3' && (
        <RoundedRect
          x={screenRect.x + screenRect.width / 2 - 45}
          y={screenRect.y + 8}
          width={90}
          height={28}
          r={14}
          color="#1a1a1a"
        />
      )}
    </Group>
  );
}

export function getFrameLayout(
  frame: DeviceFrame,
  canvasWidth: number,
  canvasHeight: number,
) {
  const isPhone = frame.category === 'iphone' || frame.category === 'android';
  const isTablet = frame.category === 'ipad';
  const bezelWidth = isPhone ? 12 : isTablet ? 16 : 20;
  const bezelTop = isPhone ? 12 : isTablet ? 16 : 24;
  const bezelBottom = isPhone ? 12 : isTablet ? 16 : 8;

  const aspectRatio = frame.screenSize.width / frame.screenSize.height;
  const maxScreenHeight = canvasHeight * 0.7;
  const maxScreenWidth = canvasWidth * 0.6;

  let screenWidth = maxScreenWidth;
  let screenHeight = screenWidth / aspectRatio;
  if (screenHeight > maxScreenHeight) {
    screenHeight = maxScreenHeight;
    screenWidth = screenHeight * aspectRatio;
  }

  const frameWidth = screenWidth + bezelWidth * 2;
  const frameHeight = screenHeight + bezelTop + bezelBottom;
  const frameX = (canvasWidth - frameWidth) / 2;
  const frameY = (canvasHeight - frameHeight) / 2;

  return {
    frameRect: { x: frameX, y: frameY, width: frameWidth, height: frameHeight },
    screenRect: {
      x: frameX + bezelWidth,
      y: frameY + bezelTop,
      width: screenWidth,
      height: screenHeight,
    },
    bezelWidth,
  };
}

function LayerRenderer({
  layer,
  canvasWidth,
  canvasHeight,
  deviceFrame,
}: {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  deviceFrame: DeviceFrame | null;
}) {
  if (layer.type === 'text') {
    return <TextLayerRenderer layer={layer} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />;
  }

  if (layer.type === 'image') {
    return (
      <ImageLayerRenderer
        layer={layer}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        deviceFrame={deviceFrame}
      />
    );
  }

  return null;
}

function TextLayerRenderer({
  layer,
  canvasWidth,
  canvasHeight,
}: {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const font = useFont(null, layer.size.height || 24);

  if (!font) return null;

  const x = canvasWidth / 2 + layer.position.x - (layer.uri.length * (layer.size.height || 24) * 0.3);
  const y = canvasHeight / 2 + layer.position.y;

  return (
    <Group opacity={layer.opacity}>
      {layer.shadow.enabled && (
        <SkiaText
          x={x + layer.shadow.offsetX}
          y={y + layer.shadow.offsetY}
          text={layer.uri}
          font={font}
          color={`rgba(0,0,0,${layer.shadow.opacity})`}
        />
      )}
      <SkiaText
        x={x}
        y={y}
        text={layer.uri}
        font={font}
        color={layer.stroke.enabled ? layer.stroke.color : '#ffffff'}
      />
    </Group>
  );
}

function ImageLayerRenderer({
  layer,
  canvasWidth,
  canvasHeight,
  deviceFrame,
}: {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  deviceFrame: DeviceFrame | null;
}) {
  const image = useImage(layer.uri);

  if (!image) return null;

  let x: number, y: number, drawWidth: number, drawHeight: number;

  if (deviceFrame) {
    // Place image inside device frame screen area
    const { screenRect } = getFrameLayout(deviceFrame, canvasWidth, canvasHeight);
    const aspectRatio = layer.size.width / layer.size.height;
    drawWidth = screenRect.width;
    drawHeight = drawWidth / aspectRatio;
    if (drawHeight > screenRect.height) {
      drawHeight = screenRect.height;
      drawWidth = drawHeight * aspectRatio;
    }
    x = screenRect.x + (screenRect.width - drawWidth) / 2 + layer.position.x;
    y = screenRect.y + (screenRect.height - drawHeight) / 2 + layer.position.y;
  } else {
    // No device frame - place centered on canvas
    const aspectRatio = layer.size.width / layer.size.height;
    const maxWidth = canvasWidth * 0.8;
    const maxHeight = canvasHeight * 0.8;
    drawWidth = maxWidth;
    drawHeight = drawWidth / aspectRatio;
    if (drawHeight > maxHeight) {
      drawHeight = maxHeight;
      drawWidth = drawHeight * aspectRatio;
    }
    x = (canvasWidth - drawWidth) / 2 + layer.position.x;
    y = (canvasHeight - drawHeight) / 2 + layer.position.y;
  }

  const hasCornerRadius = layer.cornerRadius > 0;

  if (hasCornerRadius) {
    return (
      <Group opacity={layer.opacity}>
        <RoundedRect x={x} y={y} width={drawWidth} height={drawHeight} r={layer.cornerRadius}>
          {layer.shadow.enabled && (
            <Shadow
              dx={layer.shadow.offsetX}
              dy={layer.shadow.offsetY}
              blur={layer.shadow.blur}
              color={layer.shadow.color}
            />
          )}
          <Image image={image} x={x} y={y} width={drawWidth} height={drawHeight} fit="cover" />
        </RoundedRect>
        {layer.stroke.enabled && layer.stroke.width > 0 && (
          <RoundedRect
            x={x}
            y={y}
            width={drawWidth}
            height={drawHeight}
            r={layer.cornerRadius}
            color="transparent"
            style="stroke"
            strokeWidth={layer.stroke.width}
          >
            <Paint color={layer.stroke.color} style="stroke" strokeWidth={layer.stroke.width} />
          </RoundedRect>
        )}
      </Group>
    );
  }

  return (
    <Group opacity={layer.opacity}>
      {layer.shadow.enabled && (
        <Rect x={x} y={y} width={drawWidth} height={drawHeight}>
          <Shadow
            dx={layer.shadow.offsetX}
            dy={layer.shadow.offsetY}
            blur={layer.shadow.blur}
            color={layer.shadow.color}
          />
        </Rect>
      )}
      <Image image={image} x={x} y={y} width={drawWidth} height={drawHeight} fit="cover" />
      {layer.stroke.enabled && layer.stroke.width > 0 && (
        <Rect
          x={x}
          y={y}
          width={drawWidth}
          height={drawHeight}
          color="transparent"
          style="stroke"
          strokeWidth={layer.stroke.width}
        >
          <Paint color={layer.stroke.color} style="stroke" strokeWidth={layer.stroke.width} />
        </Rect>
      )}
    </Group>
  );
}
