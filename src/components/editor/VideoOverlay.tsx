import { View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEditorStore } from '@/stores/useEditorStore';
import type { Layer } from '@/types';

interface VideoLayerViewProps {
  layer: Layer;
  screenRect: { x: number; y: number; width: number; height: number } | null;
  cornerRadius: number;
}

function VideoLayerView({ layer, screenRect, cornerRadius }: VideoLayerViewProps) {
  const player = useVideoPlayer(layer.uri, (p) => {
    p.loop = true;
    p.play();
  });

  const style = screenRect
    ? {
        position: 'absolute' as const,
        left: screenRect.x,
        top: screenRect.y,
        width: screenRect.width,
        height: screenRect.height,
        borderRadius: cornerRadius,
        overflow: 'hidden' as const,
      }
    : {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden' as const,
      };

  return (
    <View collapsable={false} pointerEvents="none" style={style}>
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
  const layers          = useEditorStore((s) => s.layers);
  const selectedFrameId = useEditorStore((s) => s.selectedFrameId);
  const frameScreenRect = useEditorStore((s) => s.frameScreenRect);
  const frameEnabled    = selectedFrameId !== 'none';

  const videoLayers = layers.filter((l) => l.type === 'video');
  if (videoLayers.length === 0) return null;

  // When frame is enabled, wait for screenRect to be computed before rendering
  if (frameEnabled && !frameScreenRect) return null;

  const crRatio = selectedFrameId === 'app-icon' ? 0.22 : 0.11;
  const cornerRadius = (frameEnabled && frameScreenRect) ? frameScreenRect.width * crRatio : 0;
  const rect = frameEnabled ? frameScreenRect : null;

  return (
    <>
      {videoLayers.map((layer) => (
        <VideoLayerView
          key={layer.id}
          layer={layer}
          screenRect={rect}
          cornerRadius={cornerRadius}
        />
      ))}
    </>
  );
}
