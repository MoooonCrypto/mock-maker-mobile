import { View, Text, TouchableOpacity, ScrollView, Image, useWindowDimensions } from 'react-native';
import { useEditorStore, createDefaultLayer } from '@/stores/useEditorStore';
import { STICKER_CATALOG, STICKER_ASSETS } from '@/constants/stickers';

const GAP = 8;
const HPAD = 16;
const CELL_H = 80; // fixed picker cell height for all categories

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function StickerPicker() {
  const { width: screenWidth } = useWindowDimensions();
  const addLayer     = useEditorStore((s) => s.addLayer);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  const handleAdd = (key: string, defaultSize: { width: number; height: number }) => {
    addLayer(createDefaultLayer('sticker', key, defaultSize));
    setActiveTool('select');
  };

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      }}
    >
      {/* Drag handle */}
      <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
      </View>

      {/* Title */}
      <View style={{ paddingHorizontal: HPAD, marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>スタンプ</Text>
      </View>

      {/* Flat sticker grid — categories rendered in order, each with own column count */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 380 }}
        contentContainerStyle={{ paddingHorizontal: HPAD, paddingBottom: 16 }}
      >
        {STICKER_CATALOG.map((category) => {
          const numCols  = category.columns;
          const cellW = Math.floor((screenWidth - HPAD * 2 - GAP * (numCols - 1)) / numCols);
          return (
            <View key={category.id}>
              {chunk(category.items, numCols).map((row, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: GAP }}>
                  {row.map((sticker, colIdx) => {
                    const asset = STICKER_ASSETS[sticker.key];
                    const ratio = sticker.defaultSize.width / sticker.defaultSize.height;
                    const imgH = 64;
                    const imgW = Math.min(Math.round(imgH * ratio), cellW - 16);
                    // landscape images (platform logos): cover crops the portrait PNG to show the centered badge
                    const resizeMode = ratio > 1 ? 'cover' : 'contain';
                    return (
                      <TouchableOpacity
                        key={sticker.key}
                        onPress={() => handleAdd(sticker.key, sticker.defaultSize)}
                        activeOpacity={0.6}
                        style={{
                          width: cellW,
                          height: 80,
                          marginRight: colIdx < numCols - 1 ? GAP : 0,
                          borderRadius: 12,
                          backgroundColor: '#fafafa',
                          borderWidth: 1.5,
                          borderColor: '#eeeeee',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {asset != null && (
                          <Image
                            source={asset}
                            style={{ width: imgW, height: imgH }}
                            resizeMode={resizeMode}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
