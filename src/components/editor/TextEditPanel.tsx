import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';
import { t } from '@/i18n';

// ── Font catalog ──────────────────────────────────────────────────────────────
const FONT_CATALOG = [
  // ── Japanese (全角対応) ───────────────────────────────────────────────────
  { key: 'noto-sans-jp',  label: 'Noto Sans JP',    group: 'ja', supportsJa: true  },
  { key: 'noto-serif-jp', label: 'Noto Serif JP',   group: 'ja', supportsJa: true  },
  { key: 'm-plus-1p',     label: 'M PLUS 1p',       group: 'ja', supportsJa: true  },
  { key: 'm-plus-r',      label: 'M PLUS Rounded',  group: 'ja', supportsJa: true  },
  { key: 'biz-ud',        label: 'BIZ UDPGothic',   group: 'ja', supportsJa: true  },
  { key: 'zen-kaku',      label: 'Zen Kaku Gothic', group: 'ja', supportsJa: true  },
  { key: 'sawarabi-g',    label: 'Sawarabi Gothic', group: 'ja', supportsJa: true  },
  { key: 'sawarabi-m',    label: 'Sawarabi Mincho', group: 'ja', supportsJa: true  },
  { key: 'kosugi-m',      label: 'Kosugi Maru',     group: 'ja', supportsJa: true  },
  { key: 'dot-gothic',    label: 'DotGothic16',     group: 'ja', supportsJa: true  },
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

// React Native font family names (loaded via useFonts in Canvas.tsx)
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

const FONT_RN_FAMILY_BOLD: Record<FontKey, string> = {
  'noto-sans-jp':  'NotoSansJP_700Bold',
  'noto-serif-jp': 'NotoSerifJP_700Bold',
  'm-plus-1p':     'MPLUS1p_700Bold',
  'm-plus-r':      'MPLUSRounded1c_700Bold',
  'biz-ud':        'BIZUDPGothic_700Bold',
  'zen-kaku':      'ZenKakuGothicNew_700Bold',
  'sawarabi-g':    'SawarabiGothic_400Regular',  // no bold variant
  'sawarabi-m':    'SawarabiMincho_400Regular',  // no bold variant
  'kosugi-m':      'KosugiMaru_400Regular',       // no bold variant
  'dot-gothic':    'DotGothic16_400Regular',      // no bold variant
  'roboto':        'Roboto',
  'inter':         'Inter_700Bold',
  'montserrat':    'Montserrat_700Bold',
  'lato':          'Lato_700Bold',
  'open-sans':     'OpenSans_700Bold',
  'oswald':        'Oswald_700Bold',
  'raleway':       'Raleway_700Bold',
  'nunito':        'Nunito_700Bold',
  'playfair':      'PlayfairDisplay_700Bold',
  'merriweather':  'Merriweather_700Bold',
};


// Pick a preview background that contrasts with the text color
function previewBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? '#1f2937' : '#f1f5f9';
}

function containsJapanese(text: string): boolean {
  return /[\u3000-\u9FFF\uF900-\uFAFF\u30A0-\u30FF\u3040-\u309F\uFF00-\uFFEF]/.test(text);
}

const FONT_SIZES = [14, 18, 24, 32, 40, 56, 72];
const TEXT_COLORS = ['#ffffff', '#1a1a1a', '#2b8cee', '#ef4444', '#22c55e', '#f59e0b', '#a855f7'];

export function TextEditPanel({ onClose }: { onClose?: () => void }) {
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const layers          = useEditorStore((s) => s.layers);
  const updateLayer     = useEditorStore((s) => s.updateLayer);

  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);

  const layer = layers.find((l) => l.id === selectedLayerId && l.type === 'text');
  if (!layer) return null;

  const fontSize   = layer.size.height || 24;
  const fontFamily = (layer.fontFamily ?? 'noto-sans-jp') as FontKey;
  const fontWeight = layer.fontWeight  ?? 'normal';
  const textColor  = layer.textColor   ?? '#ffffff';
  const underline  = layer.underline   ?? false;
  const isBold     = fontWeight === 'bold' || fontWeight === 'black';
  const hasJa      = containsJapanese(layer.uri);

  const visibleFonts  = FONT_CATALOG.filter((f) => !hasJa || f.supportsJa);
  const currentFont   = FONT_CATALOG.find((f) => f.key === fontFamily) ?? FONT_CATALOG[0];

  return (
    <ScrollView style={{ maxHeight: 320 }} className="bg-white border-t border-gray-200" nestedScrollEnabled>
      <View className="px-4 pt-3 pb-4">

        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-500">{t('textEdit.title')}</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Text edit input (doubles as preview) */}
        <TextInput
          value={layer.uri}
          onChangeText={(t) => updateLayer(layer.id, { uri: t })}
          style={{
            backgroundColor: previewBg(textColor),
            borderRadius: 12,
            height: 80,
            marginBottom: 14,
            paddingHorizontal: 16,
            fontFamily: isBold ? FONT_RN_FAMILY_BOLD[fontFamily] : FONT_RN_FAMILY[fontFamily],
            fontSize: Math.min(fontSize, 36),
            color: textColor,
            textDecorationLine: underline ? 'underline' : 'none',
            textAlign: 'center',
          }}
          multiline
          placeholderTextColor="rgba(255,255,255,0.4)"
          placeholder={t('textEdit.placeholder')}
        />

        {/* Font family — dropdown (vertical scroll, each name in its own typeface) */}
        <View className="mb-3">
          <Text className="text-sm text-gray-700 mb-2">{t('textEdit.fontLabel')}</Text>
          <TouchableOpacity
            onPress={() => setFontDropdownOpen((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: fontDropdownOpen ? colors.primary : '#e5e7eb',
              backgroundColor: '#f9fafb',
            }}
          >
            <Text
              style={{ fontFamily: isBold ? FONT_RN_FAMILY_BOLD[fontFamily] : FONT_RN_FAMILY[fontFamily], fontSize: 17, color: '#1a1a1a', flex: 1 }}
              numberOfLines={1}
            >
              {currentFont.label}
            </Text>
            <Ionicons
              name={fontDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#9ca3af"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>

          {fontDropdownOpen && (
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={{
                maxHeight: 190,
                marginTop: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#fff',
              }}
            >
              {visibleFonts.map((opt, idx) => {
                const isActive = fontFamily === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => {
                      updateLayer(layer.id, { fontFamily: opt.key });
                      setFontDropdownOpen(false);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isActive ? '#eff6ff' : 'transparent',
                      borderBottomWidth: idx < visibleFonts.length - 1 ? 1 : 0,
                      borderBottomColor: '#f3f4f6',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONT_RN_FAMILY[opt.key],
                        fontSize: 17,
                        color: isActive ? colors.primary : '#1a1a1a',
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          {hasJa && (
            <Text className="text-xs text-gray-400 mt-1">{t('textEdit.jaOnlyFonts')}</Text>
          )}
        </View>

        {/* Font size */}
        <View className="mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-700">{t('textEdit.sizeLabel')}</Text>
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

        {/* Style: Bold + Underline */}
        <View className="mb-3">
          <Text className="text-sm text-gray-700 mb-2">{t('textEdit.styleLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => updateLayer(layer.id, { fontWeight: isBold ? 'normal' : 'bold' })}
              style={{
                width: 46, height: 46,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isBold ? colors.primary : '#e5e7eb',
                backgroundColor: isBold ? '#eff6ff' : '#f9fafb',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: isBold ? colors.primary : '#6b7280' }}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateLayer(layer.id, { underline: !underline })}
              style={{
                width: 46, height: 46,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: underline ? colors.primary : '#e5e7eb',
                backgroundColor: underline ? '#eff6ff' : '#f9fafb',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', textDecorationLine: 'underline', color: underline ? colors.primary : '#6b7280' }}>U</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Text color */}
        <View>
          <Text className="text-sm text-gray-700 mb-2">{t('textEdit.colorLabel')}</Text>
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
