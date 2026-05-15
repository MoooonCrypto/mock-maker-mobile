import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Image as RNImage, useWindowDimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { colors } from '@/constants/theme';
import { t } from '@/i18n';

export interface CropRect {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

interface Props {
  visible: boolean;
  mediaType: 'image' | 'video';
  uri: string;
  sourceWidth: number;
  sourceHeight: number;
  screenAspectRatio: number;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}

const AnimatedImage = Animated.createAnimatedComponent(RNImage);
const AnimatedView = Animated.createAnimatedComponent(View);

export function MediaCropModal({
  visible,
  mediaType,
  uri,
  sourceWidth,
  sourceHeight,
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

  const maxFrameW = containerW * 0.85;
  const maxFrameH = containerH * 0.85;
  const cropFrameW =
    maxFrameW * screenAspectRatio <= maxFrameH
      ? maxFrameW
      : maxFrameH / screenAspectRatio;
  const cropFrameH = cropFrameW * screenAspectRatio;

  const initialScale = Math.max(cropFrameW / sourceWidth, cropFrameH / sourceHeight);
  const mediaBaseW = sourceWidth * initialScale;
  const mediaBaseH = sourceHeight * initialScale;

  const frameX = (containerW - cropFrameW) / 2;
  const frameY = (containerH - cropFrameH) / 2;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const viewScale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const clampTranslation = (scale: number, tx: number, ty: number) => {
    'worklet';
    const scaledWidth = mediaBaseW * scale;
    const scaledHeight = mediaBaseH * scale;
    const maxOffsetX = Math.max(0, (scaledWidth - cropFrameW) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - cropFrameH) / 2);

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, tx)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, ty)),
    };
  };

  const normalizeCropRect = (rawCropX: number, rawCropY: number, rawCropW: number, rawCropH: number): CropRect => {
    const cropW = Math.max(1, Math.min(sourceWidth, Math.round(rawCropW)));
    const cropH = Math.max(1, Math.min(sourceHeight, Math.round(rawCropH)));
    const maxCropX = Math.max(0, sourceWidth - cropW);
    const maxCropY = Math.max(0, sourceHeight - cropH);

    return {
      cropX: Math.max(0, Math.min(maxCropX, Math.round(rawCropX))),
      cropY: Math.max(0, Math.min(maxCropY, Math.round(rawCropY))),
      cropW,
      cropH,
    };
  };

  useEffect(() => {
    if (!visible) return;
    translateX.value = 0;
    translateY.value = 0;
    viewScale.value = 1;
    savedX.value = 0;
    savedY.value = 0;
    savedScale.value = 1;
  }, [savedScale, savedX, savedY, translateX, translateY, viewScale, visible, uri]);

  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const clamped = clampTranslation(viewScale.value, savedX.value + e.translationX, savedY.value + e.translationY);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const nextScale = Math.max(1, savedScale.value * e.scale);
      const clamped = clampTranslation(nextScale, translateX.value, translateY.value);
      viewScale.value = nextScale;
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedScale.value = viewScale.value;
      savedX.value = translateX.value;
      savedY.value = translateY.value;
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
    const effectiveScale = initialScale * viewScale.value;
    const mediaLeft = containerW / 2 + translateX.value - (sourceWidth * effectiveScale) / 2;
    const mediaTop = containerH / 2 + translateY.value - (sourceHeight * effectiveScale) / 2;
    const cropX = (frameX - mediaLeft) / effectiveScale;
    const cropY = (frameY - mediaTop) / effectiveScale;
    const cropW = cropFrameW / effectiveScale;
    const cropH = cropFrameH / effectiveScale;

    onConfirm(normalizeCropRect(cropX, cropY, cropW, cropH));
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
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
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>{t('imageCrop.cancel')}</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('imageCrop.title')}</Text>
          <View style={{ minWidth: 72 }} />
        </View>

        <GestureDetector gesture={composed}>
          <AnimatedView style={{ width: containerW, height: containerH, overflow: 'hidden' }}>
            {mediaType === 'image' ? (
              <AnimatedImage
                source={{ uri }}
                style={[
                  {
                    position: 'absolute',
                    width: mediaBaseW,
                    height: mediaBaseH,
                    left: (containerW - mediaBaseW) / 2,
                    top: (containerH - mediaBaseH) / 2,
                  },
                  animatedStyle,
                ]}
                resizeMode="stretch"
              />
            ) : (
              <AnimatedView
                style={[
                  {
                    position: 'absolute',
                    width: mediaBaseW,
                    height: mediaBaseH,
                    left: (containerW - mediaBaseW) / 2,
                    top: (containerH - mediaBaseH) / 2,
                    overflow: 'hidden',
                  },
                  animatedStyle,
                ]}
              >
                <VideoView player={player} nativeControls={false} contentFit="cover" style={{ width: '100%', height: '100%' }} />
              </AnimatedView>
            )}

            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={{ height: frameY, backgroundColor: 'rgba(0,0,0,0.65)' }} />
              <View style={{ height: cropFrameH, flexDirection: 'row' }}>
                <View style={{ width: frameX, backgroundColor: 'rgba(0,0,0,0.65)' }} />
                <View
                  style={{
                    width: cropFrameW,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.75)',
                    borderRadius: 18,
                  }}
                />
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />
            </View>
          </AnimatedView>
        </GestureDetector>

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
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{t('imageCrop.confirm')}</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
