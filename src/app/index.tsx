import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import type { TemplateId } from '@/constants/templates';
import { TEMPLATES } from '@/constants/templates';
import { colors } from '@/constants/theme';
import { t, templateKey } from '@/i18n';

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

function FreePreview() {
  return <View style={{ height: 80 }} />;
}

const PREVIEWS: Record<TemplateId, React.FC> = {
  single: SinglePreview,
  double: DoublePreview,
  'top-half': TopHalfPreview,
  split: SplitPreview,
  icon: IconPreview,
  free: FreePreview,
};

export default function HomeScreen() {
  const router = useRouter();
  const reset = useEditorStore((s) => s.reset);
  const setTemplateId = useEditorStore((s) => s.setTemplateId);
  const isPro = usePurchaseStore((s) => s.isPro);

  const handleSelect = (id: TemplateId) => {
    reset();
    setTemplateId(id);
    router.push(`/editor/${Date.now()}`);
  };

  const handleOpenProjects = () => {
    if (isPro) {
      router.push('/projects');
      return;
    }

    Alert.alert(t('home.proRequiredTitle'), t('home.proRequiredBody'), [
      { text: t('home.proRequiredCancel'), style: 'cancel' },
      { text: t('home.proRequiredSettings'), onPress: () => router.push('/settings') },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="px-5 pt-6 pb-2">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">MockMaker</Text>
            <Text className="text-sm text-gray-500 mt-1">{t('home.subtitle')}</Text>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleOpenProjects}
              className="w-11 h-11 rounded-2xl items-center justify-center bg-white border border-gray-200"
            >
              <Ionicons
                name={isPro ? 'folder-open-outline' : 'lock-closed-outline'}
                size={20}
                color={isPro ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              className="w-11 h-11 rounded-2xl items-center justify-center bg-white border border-gray-200"
            >
              <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/settings')}
          className="mt-4 rounded-2xl px-4 py-4"
          style={{ backgroundColor: isPro ? '#dcfce7' : '#eff6ff' }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text
                className="text-xs font-semibold"
                style={{ color: isPro ? colors.success : colors.primary }}
              >
                {isPro ? t('home.proActiveBadge') : t('home.proBadge')}
              </Text>
              <Text className="text-base font-semibold text-gray-900 mt-1">
                {isPro ? t('home.proActiveTitle') : t('home.proTitle')}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                {isPro ? t('home.proActiveBody') : t('home.proBody')}
              </Text>
            </View>
            <Ionicons
              name={isPro ? 'checkmark-circle-outline' : 'diamond-outline'}
              size={26}
              color={isPro ? colors.success : colors.primary}
            />
          </View>
        </TouchableOpacity>
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
                <Text style={{ fontWeight: '700', fontSize: 15, color: '#111', marginTop: 8 }}>
                  {t(`templates.${templateKey(tpl.id)}.label`)}
                </Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {t(`templates.${templateKey(tpl.id)}.description`)}
                </Text>
                {tpl.exportCount > 1 && (
                  <View style={{ marginTop: 6, backgroundColor: '#eef2ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 10, color: '#4f46e5', fontWeight: '600' }}>
                      {t('home.exportCount', { count: tpl.exportCount })}
                    </Text>
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
