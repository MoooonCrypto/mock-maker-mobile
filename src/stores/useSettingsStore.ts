import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExportSettings } from '../types';

interface SettingsState {
  defaultExport: ExportSettings;
  setDefaultExport: (settings: Partial<ExportSettings>) => void;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = 'mockmaker_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  defaultExport: {
    format: 'png',
    quality: 'high',
    scale: 2,
  },

  setDefaultExport: async (settings) => {
    const updated = { ...get().defaultExport, ...settings };
    set({ defaultExport: updated });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ defaultExport: updated }));
  },

  loadSettings: async () => {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.defaultExport) set({ defaultExport: parsed.defaultExport });
      }
    } catch {
      // use defaults
    }
  },
}));
