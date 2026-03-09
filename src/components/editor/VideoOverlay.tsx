import { View, useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEditorStore } from '@/stores/useEditorStore';
import type { Layer } from '@/types';

// Hardcoded screen pixel bounds for frame_img.png (1017×1680)
// screen area: x=228–808, y=216–1463
const IPHONE_SCREEN = { imgW: 1017, imgH: 1680, minX: 228, minY: 216, maxX: 808, maxY: 1463 } as const;

// Corner radius of iPhone screen area (matches ImageLayerRenderer clip)
const IPHONE_SCREEN_CR_RATIO = 0.11;

interface VideoLayerViewProps {
  layer: Layer;
  screenRect: { x: number; y: number; width: number; height: number };
}

function VideoLayerView({ layer, screenRect }: VideoLayerViewProps) {
  const player = useVideoPlayer(layer.uri, (p) => {
    p.loop = true;
    p.play();
  });

  const cornerRadius = screenRect.width * IPHONE_SCREEN_CR_RATIO;

  return (
    // collapsable={false} prevents Fabric view flattening so overflow:hidden + borderRadius
    // create a real CALayer mask that clips AVPlayerLayer to the screen rect.
    <View
      collapsable={false}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: screenRect.x,
        top: screenRect.y,
        width: screenRect.width,
        height: screenRect.height,
        borderRadius: cornerRadius,
        overflow: 'hidden',
      }}
    >
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}

export function VideoOverlay() {
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth  = screenWidth;
  const canvasHeight = screenWidth * 1.5;

  const layers          = useEditorStore((s) => s.layers);
  const frameEnabled    = useEditorStore((s) => s.selectedFrameId) !== 'none';
  const frameScale      = useEditorStore((s) => s.frameScale);

  const videoLayers = layers.filter((l) => l.type === 'video');
  if (videoLayers.length === 0) return null;

  // Compute screen rect from hardcoded iPhone frame bounds
  const { imgW, imgH, minX, minY, maxX, maxY } = IPHONE_SCREEN;
  const baseScale = Math.min(canvasWidth / imgW, canvasHeight / imgH);
  const scale     = baseScale * frameScale;
  const drawX     = (canvasWidth  - imgW * scale) / 2;
  const drawY     = (canvasHeight - imgH * scale) / 2;

  const screenRect = frameEnabled
    ? {
        x:      drawX + minX * scale,
        y:      drawY + minY * scale,
        width:  (maxX - minX + 1) * scale,
        height: (maxY - minY + 1) * scale,
      }
    : { x: 0, y: 0, width: canvasWidth, height: canvasHeight };

  return (
    <>
      {videoLayers.map((layer) => (
        <VideoLayerView key={layer.id} layer={layer} screenRect={screenRect} />
      ))}
    </>
  );
}
