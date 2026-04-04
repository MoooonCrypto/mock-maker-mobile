import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const initializePurchases = usePurchaseStore((s) => s.initialize);

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([loadSettings(), initializePurchases()]);
      } finally {
        SplashScreen.hideAsync();
      }
    }
    init();
  }, [initializePurchases, loadSettings]);

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
          name="projects"
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
