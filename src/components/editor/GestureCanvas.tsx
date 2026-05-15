import { useRef, useEffect, useCallback } from 'react';
import { View, useWindowDimensions, PixelRatio } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useEditorStore } from '@/stores/useEditorStore';
import { getMaxFrameScale } from '@/constants/canvasPresets';
import { buildMediaScene } from '@/utils/mediaScene';
import { getLogicalCanvasSize } from '@/utils/canvasMetrics';

interface Props {
  children: React.ReactNode;
  canvasAreaH: number;
  dragOffsetX: SharedValue<number>;
  dragOffsetY: SharedValue<number>;
  pinchScale:  SharedValue<number>;
  frameDragX:  SharedValue<number>;
  frameDragY:  SharedValue<number>;
  framePinchS: SharedValue<number>;
}

export function GestureCanvas({ children, canvasAreaH, dragOffsetX, dragOffsetY, pinchScale, frameDragX, frameDragY, framePinchS }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const templateId     = useEditorStore((s) => s.templateId);
  const canvasPresetId = useEditorStore((s) => s.canvasPresetId);
  const pixelRatio = PixelRatio.get();
  const { canvasWidth: canvasLogW, canvasHeight: canvasLogH } = getLogicalCanvasSize(canvasPresetId, templateId, pixelRatio);
  const displayScale = canvasAreaH > 0
    ? Math.min(screenWidth / canvasLogW, canvasAreaH / canvasLogH)
    : screenWidth / canvasLogW;

  const layers          = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const updateLayer     = useEditorStore((s) => s.updateLayer);
  const selectLayer     = useEditorStore((s) => s.selectLayer);
  const selectedFrameId = useEditorStore((s) => s.selectedFrameId);
  const activeTool      = useEditorStore((s) => s.activeTool);
  const framePosition   = useEditorStore((s) => s.framePosition);
  const setFramePosition = useEditorStore((s) => s.setFramePosition);
  const frameScale      = useEditorStore((s) => s.frameScale);
  const setFrameScale   = useEditorStore((s) => s.setFrameScale);

  // Sync JS values → SharedValues so worklets can read them
  const selectedIdSV  = useSharedValue(selectedLayerId ?? '');
  const activeToolSV  = useSharedValue(activeTool);

  useEffect(() => { selectedIdSV.value = selectedLayerId ?? ''; }, [selectedLayerId]);
  useEffect(() => { activeToolSV.value = activeTool; }, [activeTool]);

  // ─── Layer drag ──────────────────────────────────────────────────────────

  const commitDrag = useCallback((layerId: string, dx: number, dy: number) => {
    const layer = layers.find((l) => l.id === layerId);
    if (layer) {
      updateLayer(layerId, {
        position: { x: layer.position.x + dx, y: layer.position.y + dy },
      });
    }
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
  }, [layers, updateLayer, dragOffsetX, dragOffsetY]);

  // ─── Frame drag ──────────────────────────────────────────────────────────

  const commitFrameDrag = useCallback((dx: number, dy: number) => {
    setFramePosition({ x: framePosition.x + dx, y: framePosition.y + dy });
    frameDragX.value = 0;
    frameDragY.value = 0;
  }, [framePosition, setFramePosition, frameDragX, frameDragY]);

  // ─── Pan ─────────────────────────────────────────────────────────────────

  const pan = Gesture.Pan()
    .onBegin(() => {
      dragOffsetX.value = 0;
      dragOffsetY.value = 0;
      frameDragX.value  = 0;
      frameDragY.value  = 0;
    })
    .onUpdate((e) => {
      if (activeToolSV.value === 'frame') {
        frameDragX.value = e.translationX / displayScale;
        frameDragY.value = e.translationY / displayScale;
      } else if (selectedIdSV.value) {
        dragOffsetX.value = e.translationX / displayScale;
        dragOffsetY.value = e.translationY / displayScale;
      }
    })
    .onEnd((e) => {
      if (activeToolSV.value === 'frame') {
        runOnJS(commitFrameDrag)(e.translationX / displayScale, e.translationY / displayScale);
      } else if (selectedIdSV.value) {
        runOnJS(commitDrag)(selectedIdSV.value, e.translationX / displayScale, e.translationY / displayScale);
      } else {
        dragOffsetX.value = 0;
        dragOffsetY.value = 0;
      }
    })
    .minDistance(5);

  // ─── Layer scale ──────────────────────────────────────────────────────────

  const startScaleRef = useRef(1);

  const captureStartScale = useCallback(() => {
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (layer) startScaleRef.current = layer.size.width;
  }, [layers, selectedLayerId]);

  const commitScale = useCallback((layerId: string, scale: number) => {
    const layer = layers.find((l) => l.id === layerId);
    if (layer) {
      const ratio    = layer.size.width / layer.size.height;
      const newWidth = startScaleRef.current * scale;
      updateLayer(layerId, { size: { width: newWidth, height: newWidth / ratio } });
    }
    pinchScale.value = 1;
  }, [layers, updateLayer, pinchScale]);

  // ─── Frame scale ─────────────────────────────────────────────────────────

  const frameStartScaleRef = useRef(1);

  const captureFrameStartScale = useCallback(() => {
    frameStartScaleRef.current = frameScale;
  }, [frameScale]);

  const maxFrameScale = getMaxFrameScale(canvasLogW, canvasLogH, templateId);
  const mediaScene = buildMediaScene({
    layers,
    templateId,
    selectedFrameId,
    frameScale,
    framePosition,
    canvasPresetId,
    pixelRatio,
    canvasWidth: canvasLogW,
    canvasHeight: canvasLogH,
  });
  const mediaSceneByLayerId = new Map(mediaScene.map((item) => [item.layer.id, item]));

  const commitFrameScale = useCallback((scale: number) => {
    const clamped = Math.min(Math.max(frameStartScaleRef.current * scale, 0.3), maxFrameScale);
    setFrameScale(clamped);
    framePinchS.value = 1;
  }, [setFrameScale, framePinchS, maxFrameScale]);

  // ─── Pinch ────────────────────────────────────────────────────────────────

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      if (activeTool === 'frame') {
        captureFrameStartScale();
        framePinchS.value = 1;
      } else {
        captureStartScale();
        pinchScale.value = 1;
      }
    })
    .onUpdate((e) => {
      if (activeToolSV.value === 'frame') {
        framePinchS.value = e.scale;
      } else if (selectedIdSV.value) {
        pinchScale.value = e.scale;
      }
    })
    .onEnd((e) => {
      if (activeToolSV.value === 'frame') {
        commitFrameScale(e.scale);
      } else if (selectedIdSV.value) {
        commitScale(selectedIdSV.value, e.scale);
      } else {
        pinchScale.value = 1;
      }
    });

  // ─── Tap (layer selection) ────────────────────────────────────────────────

  const tap = Gesture.Tap().runOnJS(true).onEnd((e) => {
    const tapX = e.x / displayScale;
    const tapY = e.y / displayScale;
    let found: string | null = null;

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];

      let lx: number, ly: number, halfW: number, halfH: number;

      if (layer.type === 'image' || layer.type === 'video') {
        const rect = mediaSceneByLayerId.get(layer.id)?.targetRect;
        if (!rect) continue;
        lx    = rect.x + rect.width / 2;
        ly    = rect.y + rect.height / 2;
        halfW = rect.width * 0.5;
        halfH = rect.height * 0.5;
      } else {
        const centerX = canvasLogW / 2;
        const centerY = canvasLogH / 2;
        lx    = centerX + layer.position.x;
        ly    = centerY + layer.position.y;
        halfW = layer.size.width  * 0.5;
        halfH = layer.size.height * 0.5;
      }

      if (tapX >= lx - halfW && tapX <= lx + halfW &&
          tapY >= ly - halfH && tapY <= ly + halfH) {
        found = layer.id;
        break;
      }
    }
    selectLayer(found);
  });

  const composed = Gesture.Simultaneous(pan, pinch, tap);

  const displayW = canvasLogW * displayScale;
  const displayH = canvasLogH * displayScale;

  return (
    <GestureHandlerRootView style={{ width: displayW, height: displayH }}>
      <GestureDetector gesture={composed}>
        <View style={{ width: displayW, height: displayH, overflow: 'hidden' }}>
          <View style={{
            width: canvasLogW,
            height: canvasLogH,
            transform: [
              { translateX: canvasLogW * (displayScale - 1) / 2 },
              { translateY: canvasLogH * (displayScale - 1) / 2 },
              { scale: displayScale },
            ],
          }}>
            {children}
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
