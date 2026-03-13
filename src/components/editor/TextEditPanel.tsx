import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';

// ── Font catalog ──────────────────────────────────────────────────────────────
const FONT_CATALOG = [
  // ── Japanese (全角対応) ───────────────────────────────────────────────────
  { key: 'noto-sans-jp',  label: 'Noto Sans JP',     group: 'ja', supportsJa: true  },
  { key: 'noto-serif-jp', label: 'Noto Serif JP',    group: 'ja', supportsJa: true  },
  { key: 'm-plus-1p',     label: 'M PLUS 1p',        group: 'ja', supportsJa: true  },
  { key: 'm-plus-r',      label: 'M PLUS Rounded',   group: 'ja', supportsJa: true  },
  { key: 'biz-ud',        label: 'BIZ UDPGothic',    group: 'ja', supportsJa: true  },
  { key: 'zen-kaku',      label: 'Zen Kaku Gothic',  group: 'ja', supportsJa: true  },
  { key: 'sawarabi-g',    label: 'Sawarabi Gothic',  group: 'ja', supportsJa: true  },
  { key: 'sawarabi-m',    label: 'Sawarabi Mincho',  group: 'ja', supportsJa: true  },
  { key: 'kosugi-m',      label: 'Kosugi Maru',      group: 'ja', supportsJa: true  },
  { key: 'dot-gothic',    label: 'DotGothic16',      group: 'ja', supportsJa: true  },
  // ── Latin (半角) ─────────────────────────────────────────────────────────
  { key: 'roboto',        label: 'Roboto',           group: 'en', supportsJa: false },
  { key: 'inter',         label: 'Inter',            group: 'en', supportsJa: false },
  { key: 'montserrat',    label: 'Montserrat',       group: 'en', supportsJa: false },
  { key: 'lato',          label: 'Lato',             group: 'en', supportsJa: false },
  { key: 'open-sans',     label: 'Open Sans',        group: 'en', supportsJa: false },
  { key: 'oswald',        label: 'Oswald',           group: 'en', supportsJa: false },
  { key: 'raleway',       label: 'Raleway',          group: 'en', supportsJa: false },
  { key: 'nunito',        label: 'Nunito',           group: 'en', supportsJa: false },
  { key: 'playfair',      label: 'Playfair Display', group: 'en', supportsJa: false },
  { key: 'merriweather',  label: 'Merriweather',     group: 'en', supportsJa: false },
] as const;

type FontKey = typeof FONT_CATALOG[number]['key'];

// React Native font family names (from @expo-google-fonts loaded in Canvas.tsx)
const FONT_RN_FAMILY: Record<FontKey, string> = {
  'noto-sans-jp':  'NotoSansJP_400Regular',
  'noto-serif-jp': 'NotoSerifJP_400Regular',
  'm-plus-1p':     'MPLUS1p_400Regular',
  'm-plus-r':      'MPLUSRounded1c_400Regular',
  'biz-ud':        'BIZUDPGothic_400Regular',
  'zen-kaku':      'ZenKakuGothicNew_400Regular',
  'sawarabi-g':    'SawarabiGothic_400Regular',
  'sawarabi-m':    'SawarabiMincho_400Regular',
  'kosugi-m':      'KosugiMaru_400Regular',
  'dot-gothic':    'DotGothic16_400Regular',
  'roboto':        'Roboto',
  'inter':         'Inter_400Regular',
  'montserrat':    'Montserrat_400Regular',
  'lato':          'Lato_400Regular',
  'open-sans':     'OpenSans_400Regular',
  'oswald':        'Oswald_400Regular',
  'raleway':       'Raleway_400Regular',
  'nunito':        'Nunito_400Regular',
  'playfair':      'PlayfairDisplay_400Regular',
  'merriweather':  'Merriweather_400Regular',
};

function containsJapanese(text: string): boolean {
  return /[\u3000-\u9FFF\uF900-\uFAFF\u30A0-\u30FF\u3040-\u309F\uFF00-\uFFEF]/.test(text);
}

const FONT_SIZES = [14, 18, 24, 32, 40, 56, 72];
const FONT_WEIGHTS = [
  { key: 'normal' as const, label: 'Regular' },
  { key: 'bold'   as const, label: 'Bold' },
  { key: 'black'  as const, label: 'Black' },
];
const TEXT_COLORS = ['#ffffff', '#1a1a1a', '#2b8cee', '#ef4444', '#22c55e', '#f59e0b', '#a855f7'];

export function TextEditPanel({ onClose }: { onClose?: () => void }) {
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const layers          = useEditorStore((s) => s.layers);
  const updateLayer     = useEditorStore((s) => s.updateLayer);

  const layer = layers.find((l) => l.id === selectedLayerId && l.type === 'text');
  if (!layer) return null;

  const fontSize   = layer.size.height || 24;
  const fontFamily = (layer.fontFamily ?? 'noto-sans-jp') as FontKey;
  const fontWeight = layer.fontWeight  ?? 'normal';
  const textColor  = layer.textColor   ?? '#ffffff';
  const hasJa      = containsJapanese(layer.uri);

  const visibleFonts = FONT_CATALOG.filter((f) => !hasJa || f.supportsJa);

  return (
    <ScrollView style={{ maxHeight: 310 }} className="bg-white border-t border-gray-200">
      <View className="px-4 pt-3 pb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-500">テキスト編集</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Font size */}
        <View className="mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-700">文字サイズ</Text>
            <Text className="text-sm text-gray-400">{fontSize}pt</Text>
          </View>
          <Slider
            minimumValue={12}
            maximumValue={80}
            step={1}
            value={fontSize}
            onValueChange={(v) => updateLayer(layer.id, { size: { width: layer.size.width, height: v } })}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor={colors.primary}
          />
          <View className="flex-row gap-2 mt-1 flex-wrap">
            {FONT_SIZES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => updateLayer(layer.id, { size: { width: layer.size.width, height: s } })}
                className={`px-2 py-1 rounded-md ${fontSize === s ? 'bg-primary' : 'bg-gray-100'}`}
              >
                <Text className={`text-xs font-medium ${fontSize === s ? 'text-white' : 'text-gray-600'}`}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Font family — horizontal scroll, each name in its own font */}
        <View className="mb-3">
          <Text className="text-sm text-gray-700 mb-2">フォント</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {visibleFonts.map((opt) => {
              const isActive = fontFamily === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => updateLayer(layer.id, { fontFamily: opt.key })}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: isActive ? colors.primary : '#e5e7eb',
                    backgroundColor: isActive ? '#eff6ff' : '#f9fafb',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 110,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT_RN_FAMILY[opt.key],
                      fontSize: 17,
                      color: isActive ? colors.primary : '#1a1a1a',
                    }}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {hasJa && (
            <Text className="text-xs text-gray-400 mt-1 ml-1">日本語テキストのため日本語対応フォントのみ表示</Text>
          )}
        </View>

        {/* Font weight */}
        <View className="mb-3">
          <Text className="text-sm text-gray-700 mb-2">ウェイト</Text>
          <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
            {FONT_WEIGHTS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => updateLayer(layer.id, { fontWeight: key })}
                className={`flex-1 py-2 items-center ${fontWeight === key ? 'bg-primary' : ''}`}
              >
                <Text className={`text-sm font-medium ${fontWeight === key ? 'text-white' : 'text-gray-600'}`}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Text color */}
        <View>
          <Text className="text-sm text-gray-700 mb-2">文字色</Text>
          <View className="flex-row gap-2">
            {TEXT_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => updateLayer(layer.id, { textColor: c })}
                style={{
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: c,
                  borderWidth: textColor === c ? 3 : 1,
                  borderColor: textColor === c ? colors.primary : '#e5e7eb',
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
