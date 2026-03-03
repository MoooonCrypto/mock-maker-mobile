import { useRef, useEffect, useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useEditorStore } from '@/stores/useEditorStore';

interface Props {
  children: React.ReactNode;
  dragOffsetX: SharedValue<number>;
  dragOffsetY: SharedValue<number>;
  pinchScale:  SharedValue<number>;
}

export function GestureCanvas({ children, dragOffsetX, dragOffsetY, pinchScale }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const canvasHeight = screenWidth * 1.5;

  const layers         = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const updateLayer    = useEditorStore((s) => s.updateLayer);
  const selectLayer    = useEditorStore((s) => s.selectLayer);

  // Sync selectedLayerId → SharedValue so worklets can read it
  const selectedIdSV = useSharedValue(selectedLayerId ?? '');
  useEffect(() => {
    selectedIdSV.value = selectedLayerId ?? '';
  }, [selectedLayerId]);

  // ─── Drag ────────────────────────────────────────────────────────────────

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

  // Pan runs on the UI thread — onUpdate only sets SharedValues (no runOnJS needed)
  const pan = Gesture.Pan()
    .onBegin(() => {
      dragOffsetX.value = 0;
      dragOffsetY.value = 0;
    })
    .onUpdate((e) => {
      if (selectedIdSV.value) {
        dragOffsetX.value = e.translationX;
        dragOffsetY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (selectedIdSV.value) {
        runOnJS(commitDrag)(selectedIdSV.value, e.translationX, e.translationY);
      } else {
        dragOffsetX.value = 0;
        dragOffsetY.value = 0;
      }
    })
    .minDistance(5);

  // ─── Pinch ───────────────────────────────────────────────────────────────

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

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      captureStartScale();
      pinchScale.value = 1;
    })
    .onUpdate((e) => {
      if (selectedIdSV.value) pinchScale.value = e.scale;
    })
    .onEnd((e) => {
      if (selectedIdSV.value) commitScale(selectedIdSV.value, e.scale);
      else pinchScale.value = 1;
    });

  // ─── Tap (layer selection) ────────────────────────────────────────────────

  const tap = Gesture.Tap().runOnJS(true).onEnd((e) => {
    const centerX = screenWidth / 2;
    const centerY = canvasHeight / 2;
    let found: string | null = null;

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const lx    = centerX + layer.position.x;
      const ly    = centerY + layer.position.y;
      const halfW = layer.size.width  * 0.5;
      const halfH = layer.size.height * 0.5;
      if (e.x >= lx - halfW && e.x <= lx + halfW &&
          e.y >= ly - halfH && e.y <= ly + halfH) {
        found = layer.id;
        break;
      }
    }
    selectLayer(found);
  });

  const composed = Gesture.Simultaneous(pan, pinch, tap);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={composed}>
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
