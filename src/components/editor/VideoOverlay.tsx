import { View, useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEditorStore } from '@/stores/useEditorStore';
import { getFrameLayout } from './Canvas';
import type { Layer } from '@/types';

interface VideoLayerViewProps {
  layer: Layer;
  screenRect: { x: number; y: number; width: number; height: number };
}

function VideoLayerView({ layer, screenRect }: VideoLayerViewProps) {
  const player = useVideoPlayer(layer.uri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{
        position: 'absolute',
        left: screenRect.x,
        top: screenRect.y,
        width: screenRect.width,
        height: screenRect.height,
      }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function VideoOverlay() {
  const { width: screenWidth } = useWindowDimensions();
  const canvasWidth = screenWidth;
  const canvasHeight = screenWidth * 1.5;

  const layers = useEditorStore((s) => s.layers);
  const deviceFrame = useEditorStore((s) => s.deviceFrame);

  const videoLayers = layers.filter((l) => l.type === 'video');
  if (videoLayers.length === 0) return null;

  let screenRect = { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  if (deviceFrame) {
    const layout = getFrameLayout(deviceFrame, canvasWidth, canvasHeight);
    screenRect = layout.screenRect;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
      }}
    >
      {videoLayers.map((layer) => (
        <VideoLayerView key={layer.id} layer={layer} screenRect={screenRect} />
      ))}
    </View>
  );
}
