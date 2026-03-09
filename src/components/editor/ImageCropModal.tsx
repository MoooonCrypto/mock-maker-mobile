import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Image as RNImage, useWindowDimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

interface CropRect {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

interface Props {
  visible: boolean;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  /** height / width of the device screen area */
  screenAspectRatio: number;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}

const AnimatedImage = Animated.createAnimatedComponent(RNImage);

export function ImageCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  screenAspectRatio,
  onConfirm,
  onCancel,
}: Props) {
  const { width: windowW, height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const HEADER_H = 56 + insets.top;
  const FOOTER_H = 80 + insets.bottom;
  const containerW = windowW;
  const containerH = windowH - HEADER_H - FOOTER_H;

  // Crop frame: device screen aspect ratio, fits inside container with padding
  const maxFrameW = containerW * 0.85;
  const maxFrameH = containerH * 0.85;
  const cropFrameW =
    maxFrameW * screenAspectRatio <= maxFrameH
      ? maxFrameW
      : maxFrameH / screenAspectRatio;
  const cropFrameH = cropFrameW * screenAspectRatio;

  // Minimum scale so image covers the crop frame
  const initialScale = Math.max(cropFrameW / imageWidth, cropFrameH / imageHeight);

  // Image base size in gesture area (pre-scaled to cover frame)
  const imgBaseW = imageWidth * initialScale;
  const imgBaseH = imageHeight * initialScale;

  // Crop frame position in container
  const frameX = (containerW - cropFrameW) / 2;
  const frameY = (containerH - cropFrameH) / 2;

  // Gesture shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const viewScale  = useSharedValue(1);
  const savedX     = useSharedValue(0);
  const savedY     = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Reset on open
  useEffect(() => {
    if (visible) {
      translateX.value = 0;
      translateY.value = 0;
      viewScale.value  = 1;
      savedX.value     = 0;
      savedY.value     = 0;
      savedScale.value = 1;
    }
  }, [visible]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      viewScale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      savedScale.value = viewScale.value;
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: viewScale.value },
    ],
  }));

  const handleConfirm = () => {
    const s  = viewScale.value;
    const tx = translateX.value;
    const ty = translateY.value;

    // Total scale: original image pixels → screen pixels
    const effectiveScale = initialScale * s;

    // Image top-left in container space
    const imgLeft = containerW / 2 + tx - (imageWidth  * effectiveScale) / 2;
    const imgTop  = containerH / 2 + ty - (imageHeight * effectiveScale) / 2;

    // Crop frame top-left in container space
    const fLeft = (containerW - cropFrameW) / 2;
    const fTop  = (containerH - cropFrameH) / 2;

    // Crop rect in original image pixels
    const cropX = (fLeft - imgLeft) / effectiveScale;
    const cropY = (fTop  - imgTop)  / effectiveScale;
    const cropW = cropFrameW / effectiveScale;
    const cropH = cropFrameH / effectiveScale;

    onConfirm({
      cropX: Math.max(0, Math.round(cropX)),
      cropY: Math.max(0, Math.round(cropY)),
      cropW: Math.min(imageWidth,  Math.round(cropW)),
      cropH: Math.min(imageHeight, Math.round(cropH)),
    });
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header */}
        <View
          style={{
            height: HEADER_H,
            paddingTop: insets.top,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
          }}
        >
          <TouchableOpacity onPress={onCancel} hitSlop={8} style={{ minWidth: 72 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            フレームに配置
          </Text>
          <View style={{ minWidth: 72 }} />
        </View>

        {/* Gesture area */}
        <GestureDetector gesture={composed}>
          <Animated.View
            style={{ width: containerW, height: containerH, overflow: 'hidden' }}
          >
            {/* Image */}
            <AnimatedImage
              source={{ uri: imageUri }}
              style={[
                {
                  position: 'absolute',
                  width: imgBaseW,
                  height: imgBaseH,
                  left: (containerW - imgBaseW) / 2,
                  top:  (containerH - imgBaseH) / 2,
                },
                animatedStyle,
              ]}
              resizeMode="stretch"
            />

            {/* Dark overlay with crop hole (4-view technique) */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {/* Top */}
              <View style={{ height: frameY, backgroundColor: 'rgba(0,0,0,0.65)' }} />
              {/* Middle row */}
              <View style={{ height: cropFrameH, flexDirection: 'row' }}>
                <View style={{ width: frameX, backgroundColor: 'rgba(0,0,0,0.65)' }} />
                {/* Crop frame outline */}
                <View
                  style={{
                    width: cropFrameW,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.75)',
                  }}
                />
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />
              </View>
              {/* Bottom */}
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Footer */}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingBottom: insets.bottom,
          }}
        >
          <TouchableOpacity
            onPress={handleConfirm}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              paddingVertical: 14,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>追加</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
