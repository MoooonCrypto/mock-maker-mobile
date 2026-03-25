import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEditorStore } from '@/stores/useEditorStore';
import type { TemplateId } from '@/constants/templates';
import { TEMPLATES } from '@/constants/templates';
import { t, templateKey } from '@/i18n';

// ─── Template preview illustrations ──────────────────────────────────────────

function SinglePreview() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 80 }}>
      <View style={{ width: 36, height: 68, borderRadius: 6, borderWidth: 2.5, borderColor: '#555', backgroundColor: '#d0d8f0' }}>
        <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: '#555', alignSelf: 'center', marginTop: 5 }} />
      </View>
    </View>
  );
}

function DoublePreview() {
  const phone = (
    <View style={{ width: 26, height: 50, borderRadius: 5, borderWidth: 2, borderColor: '#555', backgroundColor: '#d0d8f0' }}>
      <View style={{ width: 8, height: 2.5, borderRadius: 2, backgroundColor: '#555', alignSelf: 'center', marginTop: 4 }} />
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 80 }}>
      {phone}
      {phone}
    </View>
  );
}

function TopHalfPreview() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 80 }}>
      <View style={{ width: 36, height: 48, overflow: 'hidden', borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: 2.5, borderBottomWidth: 0, borderColor: '#555', backgroundColor: '#d0d8f0' }}>
        <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: '#555', alignSelf: 'center', marginTop: 5 }} />
        <View style={{ flex: 1, backgroundColor: '#b8c4e8', marginTop: 4 }} />
      </View>
      <View style={{ width: 36, height: 2.5, backgroundColor: '#555', opacity: 0.3 }} />
    </View>
  );
}

function SplitPreview() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 80 }}>
      <View style={{ width: 22, height: 62, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderWidth: 2, borderRightWidth: 0, borderColor: '#555', backgroundColor: '#d0d8f0' }} />
      <View style={{ width: 1.5, height: 62, backgroundColor: '#aaa' }} />
      <View style={{ width: 22, height: 62, borderTopRightRadius: 6, borderBottomRightRadius: 6, borderWidth: 2, borderLeftWidth: 0, borderColor: '#555', backgroundColor: '#d0d8f0' }} />
    </View>
  );
}

function IconPreview() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 80 }}>
      <View style={{ width: 54, height: 54, borderRadius: 13, borderWidth: 2.5, borderColor: '#555', backgroundColor: '#d0d8f0' }} />
    </View>
  );
}

const PREVIEWS: Record<TemplateId, React.FC> = {
  single:     SinglePreview,
  double:     DoublePreview,
  'top-half': TopHalfPreview,
  split:      SplitPreview,
  icon:       IconPreview,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const reset = useEditorStore((s) => s.reset);
  const setTemplateId = useEditorStore((s) => s.setTemplateId);

  const handleSelect = (id: TemplateId) => {
    reset();
    setTemplateId(id);
    router.push(`/editor/${Date.now()}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="px-5 pt-6 pb-2">
        <Text className="text-2xl font-bold text-gray-900">MockMaker</Text>
        <Text className="text-sm text-gray-500 mt-1">{t('home.subtitle')}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 24 }}>
          {TEMPLATES.map((tpl) => {
            const Preview = PREVIEWS[tpl.id];
            return (
              <TouchableOpacity
                key={tpl.id}
                onPress={() => handleSelect(tpl.id)}
                activeOpacity={0.7}
                style={{
                  width: '47%',
                  backgroundColor: 'white',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Preview />
                <Text style={{ fontWeight: '700', fontSize: 15, color: '#111', marginTop: 8 }}>{t(`templates.${templateKey(tpl.id)}.label`)}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t(`templates.${templateKey(tpl.id)}.description`)}</Text>
                {tpl.exportCount > 1 && (
                  <View style={{ marginTop: 6, backgroundColor: '#eef2ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 10, color: '#4f46e5', fontWeight: '600' }}>{t('home.exportCount', { count: tpl.exportCount })}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
