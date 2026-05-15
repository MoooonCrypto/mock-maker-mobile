import { useMemo } from 'react';
import { View, PixelRatio } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEditorStore } from '@/stores/useEditorStore';
import { buildMediaScene } from '@/utils/mediaScene';
import { getLogicalCanvasSize } from '@/utils/canvasMetrics';

function VideoLayerView({
  uri,
  drawLeft,
  drawTop,
  drawWidth,
  drawHeight,
}: {
  uri: string;
  drawLeft: number;
  drawTop: number;
  drawWidth: number;
  drawHeight: number;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: drawLeft,
        top: drawTop,
        width: drawWidth,
        height: drawHeight,
      }}
    >
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="cover"
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}

export function VideoOverlay() {
  const templateId = useEditorStore((s) => s.templateId);
  const canvasPresetId = useEditorStore((s) => s.canvasPresetId);
  const layers = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const selectedFrameId = useEditorStore((s) => s.selectedFrameId);
  const frameScale = useEditorStore((s) => s.frameScale);
  const framePosition = useEditorStore((s) => s.framePosition);

  const pixelRatio = PixelRatio.get();
  const { canvasWidth, canvasHeight } = getLogicalCanvasSize(canvasPresetId, templateId, pixelRatio);
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

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
      {mediaScene.filter((item) => item.layer.type === 'video').map((item) => {
        const layer = item.layer;
        const rect = item.targetRect;
        const drawRect = item.drawRect;

        return (
          <View
            key={layer.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              overflow: 'hidden',
              borderRadius: item.cornerRadius,
              borderWidth: !item.isFramed && selectedLayerId === layer.id ? 1.5 : 0,
              borderColor: 'rgba(43,140,238,0.9)',
            }}
          >
            <VideoLayerView
              uri={layer.uri}
              drawLeft={drawRect.x - rect.x}
              drawTop={drawRect.y - rect.y}
              drawWidth={drawRect.width}
              drawHeight={drawRect.height}
            />
          </View>
        );
      })}
    </View>
  );
}
