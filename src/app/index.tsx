import { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEditorStore } from '@/stores/useEditorStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { presetBackgrounds } from '@/constants/backgrounds';
import { colors } from '@/constants/theme';
import type { Background } from '@/types';

interface Template {
  id: string;
  name: string;
  description: string;
  background: Background;
  icon: keyof typeof Ionicons.glyphMap;
}

const templates: Template[] = [
  {
    id: 'iphone-gradient-purple',
    name: 'パープルグラデーション',
    description: 'モダンなパープル系グラデーション',
    background: presetBackgrounds[4],
    icon: 'phone-portrait-outline',
  },
  {
    id: 'iphone-gradient-blue',
    name: 'ブルーグラデーション',
    description: 'クールなブルー系グラデーション',
    background: presetBackgrounds[6],
    icon: 'phone-portrait-outline',
  },
  {
    id: 'iphone-gradient-pink',
    name: 'ピンクグラデーション',
    description: 'フレッシュなピンク系グラデーション',
    background: presetBackgrounds[5],
    icon: 'phone-portrait-outline',
  },
  {
    id: 'iphone-dark',
    name: 'ダークテーマ',
    description: 'スタイリッシュなダーク背景',
    background: presetBackgrounds[3],
    icon: 'phone-portrait-outline',
  },
  {
    id: 'iphone-white',
    name: 'ホワイト',
    description: 'クリーンなホワイト背景',
    background: presetBackgrounds[0],
    icon: 'phone-portrait-outline',
  },
  {
    id: 'iphone-brand-blue',
    name: 'ブランドブルー',
    description: 'ビビッドなブランドカラー',
    background: presetBackgrounds[11],
    icon: 'phone-portrait-outline',
  },
];

function getBackgroundColor(bg: Background): string {
  if (bg.type === 'solid') return bg.color ?? '#ffffff';
  if (bg.type === 'gradient' && bg.gradient) return bg.gradient.colors[0];
  return '#f6f7f8';
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { reset, setBackground, setSessionName, setLayers, setSelectedFrameId } = useEditorStore();
  const { projects, loadProjectList, loadProject, deleteProject } = useProjectStore();

  useEffect(() => {
    loadProjectList();
  }, []);

  const handleNewProject = () => {
    reset();
    router.push(`/editor/${Date.now()}`);
  };

  const handleSelectTemplate = (template: Template) => {
    reset();
    setSessionName(template.name);
    setBackground(template.background);
    router.push(`/editor/${Date.now()}`);
  };

  const handleOpenProject = async (projectId: string) => {
    const data = await loadProject(projectId);
    if (!data) {
      Alert.alert('エラー', 'プロジェクトが見つかりませんでした');
      return;
    }
    reset();
    setSessionName(data.name);
    setBackground(data.background);
    setSelectedFrameId(data.selectedFrameId);
    setLayers(data.layers);
    router.push(`/editor/${projectId}`);
  };

  const handleDeleteProject = (projectId: string, name: string) => {
    Alert.alert('削除', `「${name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: () => deleteProject(projectId),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">MockMaker</Text>
        <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={8}>
          <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* New Project Button */}
        <View className="mx-5 mb-6">
          <TouchableOpacity
            onPress={handleNewProject}
            activeOpacity={0.8}
            className="bg-primary rounded-xl py-4 flex-row items-center justify-center"
            style={{
              shadowColor: '#2b8cee',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color="#fff" />
            <Text className="text-white font-semibold text-base ml-2">新規作成（空白）</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Projects */}
        {projects.length > 0 && (
          <>
            <View className="px-5 mb-3">
              <Text className="text-lg font-bold text-gray-900">保存済みプロジェクト</Text>
            </View>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                onPress={() => handleOpenProject(project.id)}
                activeOpacity={0.7}
                className="mx-5 mb-2 bg-white rounded-xl px-4 py-3 flex-row items-center"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
              >
                <View className="w-10 h-10 bg-primary/10 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="document-outline" size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{project.name}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">{formatDate(project.updatedAt)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteProject(project.id, project.name)}
                  hitSlop={8}
                  className="ml-2 p-1"
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            <View className="mb-4" />
          </>
        )}

        {/* Templates */}
        <View className="px-5 mb-3">
          <Text className="text-lg font-bold text-gray-900">テンプレートから始める</Text>
          <Text className="text-sm text-gray-400 mt-0.5">背景が設定済みのテンプレートを選択</Text>
        </View>

        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => {
            const bgColor = getBackgroundColor(item.background);
            const isDark =
              item.background.type === 'solid' &&
              item.background.color === '#0f0f0f';
            return (
              <TouchableOpacity
                onPress={() => handleSelectTemplate(item)}
                activeOpacity={0.7}
                className="flex-1 bg-white rounded-xl overflow-hidden"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
              >
                <View
                  className="h-28 items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                >
                  <Ionicons name={item.icon} size={44} color={isDark ? '#ffffff' : '#1a1a1a50'} />
                </View>
                <View className="p-3">
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
