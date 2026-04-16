import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { templateKey, t } from '@/i18n';
import { useProjectStore, type ProjectMeta } from '@/stores/useProjectStore';
import { useEditorStore } from '@/stores/useEditorStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';

function formatUpdatedAt(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export default function ProjectsScreen() {
  const router = useRouter();
  const projects = useProjectStore((s) => s.projects);
  const loadProjectList = useProjectStore((s) => s.loadProjectList);
  const loadProject = useProjectStore((s) => s.loadProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const hydrateProject = useEditorStore((s) => s.hydrateProject);
  const isPro = usePurchaseStore((s) => s.isPro);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadProjectList();
  }, [loadProjectList]);

  useEffect(() => {
    if (!isPro) {
      Alert.alert(t('projects.proRequiredTitle'), t('projects.proRequiredBody'), [
        { text: t('projects.closeButton'), onPress: () => router.back() },
        { text: t('projects.settingsButton'), onPress: () => router.replace('/settings') },
      ]);
    }
  }, [isPro, router]);

  const handleOpen = async (projectId: string) => {
    setBusyId(projectId);
    try {
      const project = await loadProject(projectId);
      if (!project) {
        Alert.alert(t('projects.loadErrorTitle'), t('projects.loadErrorBody'));
        return;
      }

      hydrateProject({
        templateId: project.templateId,
        sessionName: project.sessionName,
        layers: project.layers,
        selectedFrameId: project.selectedFrameId,
        frameScale: project.frameScale,
        framePosition: project.framePosition,
        background: project.background,
        canvasPresetId: project.canvasPresetId,
      });
      router.push(`/editor/${project.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (projectId: string) => {
    Alert.alert(t('projects.deleteTitle'), t('projects.deleteBody'), [
      { text: t('projects.cancelButton'), style: 'cancel' },
      {
        text: t('projects.deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(projectId);
          try {
            await deleteProject(projectId);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const renderProject = ({ item }: { item: ProjectMeta }) => (
    <View
      className="bg-white rounded-3xl px-4 py-4 mb-4"
      style={{
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 3,
      }}
    >
      <TouchableOpacity activeOpacity={0.86} onPress={() => handleOpen(item.id)} disabled={busyId === item.id}>
        <View className="flex-row">
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              backgroundColor: '#e5e7eb',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.thumbnailUri ? (
              <Image source={{ uri: item.thumbnailUri }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Ionicons name="image-outline" size={30} color="#94a3b8" />
            )}
          </View>

          <View className="flex-1 ml-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-bold text-gray-900" numberOfLines={2}>
                  {item.name}
                </Text>
                <View className="self-start rounded-full bg-blue-50 px-2.5 py-1 mt-2">
                  <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                    {t(`templates.${templateKey(item.templateId)}.label`)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: '#fff1f2' }}
                disabled={busyId === item.id}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color="#e11d48" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-400 mt-3">
              {t('projects.updatedAt', { date: formatUpdatedAt(item.updatedAt) })}
            </Text>

            <View className="flex-row items-center mt-4">
              <View className="flex-1 rounded-2xl bg-primary py-3 items-center justify-center">
                {busyId === item.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold">{t('projects.openButton')}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="w-10">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">{t('projects.title')}</Text>
        <View className="w-10" />
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 28, flexGrow: projects.length === 0 ? 1 : undefined }}
        renderItem={renderProject}
        ListHeaderComponent={
          projects.length > 0 ? (
            <Text className="text-sm text-gray-500 mb-4 leading-5">{t('projects.libraryIntro')}</Text>
          ) : null
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6">
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 26,
                backgroundColor: '#eff6ff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="folder-open-outline" size={36} color={colors.primary} />
            </View>
            <Text className="text-xl font-bold text-gray-900 mt-5">{t('projects.emptyTitle')}</Text>
            <Text className="text-sm text-gray-500 text-center mt-2 leading-5">{t('projects.emptyBody')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
