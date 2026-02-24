import { useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEditorStore } from '@/stores/useEditorStore';

interface Props {
  children: React.ReactNode;
}

export function GestureCanvas({ children }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const canvasHeight = screenWidth * 1.5;

  const layers = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const selectLayer = useEditorStore((s) => s.selectLayer);

  const startPos = useRef({ x: 0, y: 0 });

  const pan = Gesture.Pan()
    .onBegin((e) => {
      const layer = layers.find((l) => l.id === selectedLayerId);
      if (layer) {
        startPos.current = { x: layer.position.x, y: layer.position.y };
      }
    })
    .onUpdate((e) => {
      if (selectedLayerId) {
        updateLayer(selectedLayerId, {
          position: {
            x: startPos.current.x + e.translationX,
            y: startPos.current.y + e.translationY,
          },
        });
      }
    })
    .minDistance(5);

  const startScale = useRef(1);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      const layer = layers.find((l) => l.id === selectedLayerId);
      if (layer) {
        startScale.current = layer.size.width;
      }
    })
    .onUpdate((e) => {
      if (selectedLayerId) {
        const layer = layers.find((l) => l.id === selectedLayerId);
        if (layer) {
          const ratio = layer.size.width / layer.size.height;
          const newWidth = startScale.current * e.scale;
          updateLayer(selectedLayerId, {
            size: { width: newWidth, height: newWidth / ratio },
          });
        }
      }
    });

  const tap = Gesture.Tap().onEnd((e) => {
    // Find the topmost layer at tap position - simple center-hit detection
    const centerX = screenWidth / 2;
    const centerY = canvasHeight / 2;
    let found: string | null = null;

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const lx = centerX + layer.position.x;
      const ly = centerY + layer.position.y;
      const halfW = (layer.size.width * 0.4); // rough screen-space approximation
      const halfH = (layer.size.height * 0.4);
      if (
        e.x >= lx - halfW && e.x <= lx + halfW &&
        e.y >= ly - halfH && e.y <= ly + halfH
      ) {
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
