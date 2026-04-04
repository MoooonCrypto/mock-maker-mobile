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
    <View className="bg-white rounded-2xl px-4 py-4 mb-3">
      <View className="flex-row">
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 18,
            backgroundColor: '#e5e7eb',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.thumbnailUri ? (
            <Image source={{ uri: item.thumbnailUri }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Ionicons name="image-outline" size={28} color="#94a3b8" />
          )}
        </View>

        <View className="flex-1 ml-4">
          <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
          <Text className="text-sm text-gray-500 mt-1">
            {t(`templates.${templateKey(item.templateId)}.label`)}
          </Text>
          <Text className="text-xs text-gray-400 mt-2">
            {t('projects.updatedAt', { date: formatUpdatedAt(item.updatedAt) })}
          </Text>

          <View className="flex-row mt-4 gap-3">
            <TouchableOpacity
              onPress={() => handleOpen(item.id)}
              className="flex-1 rounded-xl bg-primary py-3 items-center"
              disabled={busyId === item.id}
            >
              {busyId === item.id ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold">{t('projects.openButton')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              className="rounded-xl border border-red-200 px-4 py-3 items-center justify-center"
              disabled={busyId === item.id}
            >
              <Text className="text-red-500 font-semibold">{t('projects.deleteConfirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="w-10" />
        <Text className="text-lg font-bold text-gray-900">{t('projects.title')}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 28, flexGrow: projects.length === 0 ? 1 : undefined }}
        renderItem={renderProject}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="folder-open-outline" size={42} color="#94a3b8" />
            <Text className="text-lg font-semibold text-gray-900 mt-4">{t('projects.emptyTitle')}</Text>
            <Text className="text-sm text-gray-500 text-center mt-2">{t('projects.emptyBody')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
