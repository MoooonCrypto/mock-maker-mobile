import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { colors } from '@/constants/theme';

// ── Font catalog ──────────────────────────────────────────────────────────────
// supportsJa: true = supports Japanese / CJK characters
// available:  true = font file is bundled and ready to use
const FONT_CATALOG = [
  // ── Japanese (全角対応) ───────────────────────────────────────────────────
  { key: 'noto-sans-jp',  label: 'Noto Sans JP',  group: '全角（日本語）', supportsJa: true,  available: true  },
  { key: 'noto-serif-jp', label: 'Noto Serif JP', group: '全角（日本語）', supportsJa: true,  available: true  },
  { key: 'm-plus-1p',     label: 'M PLUS 1p',     group: '全角（日本語）', supportsJa: true,  available: true  },
  { key: 'm-plus-r',      label: 'M PLUS Rounded', group: '全角（日本語）', supportsJa: true, available: true  },
  { key: 'biz-ud',        label: 'BIZ UDPGothic', group: '全角（日本語）', supportsJa: true,  available: true  },
  { key: 'zen-kaku',      label: 'Zen Kaku Gothic', group: '全角（日本語）', supportsJa: true, available: true  },
  { key: 'sawarabi-g',    label: 'Sawarabi Gothic', group: '全角（日本語）', supportsJa: true, available: true  },
  { key: 'sawarabi-m',    label: 'Sawarabi Mincho', group: '全角（日本語）', supportsJa: true, available: true  },
  { key: 'kosugi-m',      label: 'Kosugi Maru',   group: '全角（日本語）', supportsJa: true,  available: true  },
  { key: 'dot-gothic',    label: 'DotGothic16',   group: '全角（日本語）', supportsJa: true,  available: true  },
  // ── Latin (半角) ─────────────────────────────────────────────────────────
  { key: 'roboto',        label: 'Roboto',        group: '半角（Latin）', supportsJa: false, available: true  },
  { key: 'inter',         label: 'Inter',         group: '半角（Latin）', supportsJa: false, available: true  },
  { key: 'montserrat',    label: 'Montserrat',    group: '半角（Latin）', supportsJa: false, available: true  },
  { key: 'lato',          label: 'Lato',          group: '半角（Latin）', supportsJa: false, available: true  },
  { key: 'open-sans',     label: 'Open Sans',     group: '半角（Latin）', supportsJa: false, available: true  },
  { key: 'oswald',        label: 'Oswald',        group: '半角（Latin）', supportsJa: false, available: true  },
  { key: 'raleway',       label: 'Raleway',       group: '半角（Latin）', supportsJa: false, available: true  },
  { key: 'nunito',        label: 'Nunito',        group: '半角（Latin）', supportsJa: false, available: true  },
  { key: 'playfair',      label: 'Playfair Display', group: '半角（Latin）', supportsJa: false, available: true  },
  { key: 'merriweather',  label: 'Merriweather',  group: '半角（Latin）', supportsJa: false, available: true  },
] as const;

type FontKey = typeof FONT_CATALOG[number]['key'];

// Detect if string contains any Japanese/CJK characters
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
  const [fontModalVisible, setFontModalVisible] = useState(false);

  const layer = layers.find((l) => l.id === selectedLayerId && l.type === 'text');
  if (!layer) return null;

  const fontSize   = layer.size.height || 24;
  const fontFamily = (layer.fontFamily ?? 'noto-sans-jp') as FontKey;
  const fontWeight = layer.fontWeight  ?? 'normal';
  const textColor  = layer.textColor   ?? '#ffffff';

  const hasJa = containsJapanese(layer.uri);
  const currentFont = FONT_CATALOG.find((f) => f.key === fontFamily);

  const handleFontSelect = (key: FontKey) => {
    const opt = FONT_CATALOG.find((f) => f.key === key);
    if (!opt || !opt.available) return;
    // Prevent garbling: don't apply non-Japanese fonts to Japanese text
    if (hasJa && !opt.supportsJa) return;
    updateLayer(layer.id, { fontFamily: key });
    setFontModalVisible(false);
  };

  // Group fonts by section for the dropdown
  const groups = [
    { label: '全角（日本語）', items: FONT_CATALOG.filter((f) => f.group === '全角（日本語）') },
    { label: '半角（Latin）',  items: FONT_CATALOG.filter((f) => f.group === '半角（Latin）') },
  ];

  return (
    <ScrollView style={{ maxHeight: 290 }} className="bg-white border-t border-gray-200">
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

        {/* Font family — dropdown */}
        <View className="mb-3">
          <Text className="text-sm text-gray-700 mb-2">フォント</Text>
          <TouchableOpacity
            onPress={() => setFontModalVisible(true)}
            className="flex-row items-center justify-between bg-gray-100 rounded-xl px-4 py-2.5"
          >
            <Text className="text-sm text-gray-800 font-medium">{currentFont?.label ?? 'Noto Sans JP'}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {hasJa && (
            <Text className="text-xs text-gray-400 mt-1 ml-1">日本語テキストのため、日本語対応フォントのみ選択可</Text>
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

      {/* Font selection modal */}
      <Modal visible={fontModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' }}>フォントを選択</Text>
              <TouchableOpacity onPress={() => setFontModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 12 }}>
              {groups.map((group) => (
                <View key={group.label} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginLeft: 4 }}>
                    {group.label}
                  </Text>
                  {group.items.map((opt) => {
                    const isActive = fontFamily === opt.key;
                    const isDisabled = !opt.available || (hasJa && !opt.supportsJa);
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => handleFontSelect(opt.key)}
                        disabled={isDisabled}
                        style={{
                          flexDirection: 'row', alignItems: 'center',
                          paddingVertical: 10, paddingHorizontal: 12,
                          borderRadius: 10, marginBottom: 2,
                          backgroundColor: isActive ? '#eff6ff' : 'transparent',
                          opacity: isDisabled ? 0.35 : 1,
                        }}
                      >
                        {isActive && <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginRight: 8 }} />}
                        {!isActive && <View style={{ width: 24 }} />}
                        <Text style={{ flex: 1, fontSize: 14, color: isActive ? colors.primary : '#1a1a1a', fontWeight: isActive ? '600' : '400' }}>
                          {opt.label}
                        </Text>
                        {!opt.available && (
                          <Text style={{ fontSize: 10, color: '#9ca3af' }}>要インストール</Text>
                        )}
                        {opt.available && hasJa && !opt.supportsJa && (
                          <Text style={{ fontSize: 10, color: '#ef4444' }}>日本語非対応</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
