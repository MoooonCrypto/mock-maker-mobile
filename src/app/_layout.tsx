import '../global.css';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import MobileAds from 'react-native-google-mobile-ads';
import { useSettingsStore } from '@/stores/useSettingsStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    async function init() {
      // iOS: ATT ダイアログを表示してから広告SDKを初期化
      if (Platform.OS === 'ios') {
        await requestTrackingPermissionsAsync();
      }
      await MobileAds().initialize();
      await loadSettings();
      SplashScreen.hideAsync();
    }
    init();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f6f7f8' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="settings"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="editor/[id]"
          options={{ animation: 'slide_from_right' }}
        />

      </Stack>
    </>
  );
}
