import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import type { Background, Layer } from '../types';
import type { PersistedEditorState, FrameId } from './useEditorStore';
import type { TemplateId } from '@/constants/templates';
import type { CanvasPresetId } from '@/constants/canvasPresets';

const PROJECT_LIST_KEY = 'mockmaker_project_list_v2';
const PROJECTS_DIR_NAME = 'projects';
const PROJECT_JSON_NAME = 'project.json';
const PROJECT_THUMBNAIL_NAME = 'thumbnail.png';

export interface ProjectMeta {
  id: string;
  name: string;
  templateId: TemplateId;
  thumbnailUri?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectData extends ProjectMeta, PersistedEditorState {}

interface SaveProjectInput extends PersistedEditorState {
  id: string;
  thumbnailUri?: string;
}

interface SerializedProjectData {
  id: string;
  sessionName: string;
  templateId: TemplateId;
  layers: Layer[];
  background: Background;
  selectedFrameId: FrameId;
  frameScale: number;
  framePosition: { x: number; y: number };
  canvasPresetId: CanvasPresetId;
  createdAt: number;
  updatedAt: number;
}

interface ProjectStore {
  projects: ProjectMeta[];
  loadProjectList: () => Promise<void>;
  saveProject: (data: SaveProjectInput) => Promise<void>;
  loadProject: (id: string) => Promise<ProjectData | null>;
  deleteProject: (id: string) => Promise<void>;
}

function projectsRootDir(): Directory {
  const dir = new Directory(Paths.document, PROJECTS_DIR_NAME);
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true });
  }
  return dir;
}

function projectDir(projectId: string): Directory {
  const dir = new Directory(projectsRootDir(), projectId);
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true });
  }
  return dir;
}

function projectJsonFile(projectId: string): File {
  return new File(projectDir(projectId), PROJECT_JSON_NAME);
}

function projectThumbnailFile(projectId: string): File {
  return new File(projectDir(projectId), PROJECT_THUMBNAIL_NAME);
}

async function readProjectList(): Promise<ProjectMeta[]> {
  const raw = await AsyncStorage.getItem(PROJECT_LIST_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as ProjectMeta[];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

async function writeProjectList(projects: ProjectMeta[]) {
  await AsyncStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(projects));
}

async function ensurePermanentUri(uri: string, projectId: string, targetName?: string): Promise<string> {
  if (!uri) return uri;
  if (uri.startsWith('ph://')) return uri;

  const destination = targetName
    ? new File(projectDir(projectId), targetName)
    : new File(projectDir(projectId), uri.split('/').pop() ?? `media_${Date.now()}`);

  if (uri === destination.uri) return uri;

  try {
    if (destination.exists) {
      destination.delete();
    }

    const source = new File(uri);
    if (source.exists) {
      source.copy(destination);
      return destination.uri;
    }
  } catch {
    return uri;
  }

  return uri;
}

async function persistProjectData(data: SerializedProjectData) {
  const file = projectJsonFile(data.id);
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  file.write(JSON.stringify(data));
}

async function readProjectData(id: string): Promise<SerializedProjectData | null> {
  try {
    const file = projectJsonFile(id);
    if (!file.exists) return null;
    const raw = await file.text();
    return JSON.parse(raw) as SerializedProjectData;
  } catch {
    return null;
  }
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],

  loadProjectList: async () => {
    const projects = await readProjectList();
    set({ projects });
  },

  saveProject: async (input) => {
    const now = Date.now();
    const currentProjects = get().projects.length > 0 ? get().projects : await readProjectList();
    const existing = currentProjects.find((project) => project.id === input.id);
    const createdAt = existing?.createdAt ?? now;

    const layers = await Promise.all(
      input.layers.map(async (layer) => {
        if (layer.type !== 'image' && layer.type !== 'video') return layer;
        const permanentUri = await ensurePermanentUri(layer.uri, input.id);
        return { ...layer, uri: permanentUri };
      })
    );

    const background =
      input.background.type === 'image' && input.background.imageUri
        ? {
            ...input.background,
            imageUri: await ensurePermanentUri(
              input.background.imageUri,
              input.id,
              'background.png'
            ),
          }
        : input.background;

    const thumbnailUri = input.thumbnailUri
      ? await ensurePermanentUri(input.thumbnailUri, input.id, PROJECT_THUMBNAIL_NAME)
      : existing?.thumbnailUri;

    const serialized: SerializedProjectData = {
      id: input.id,
      sessionName: input.sessionName,
      templateId: input.templateId,
      layers,
      background,
      selectedFrameId: input.selectedFrameId,
      frameScale: input.frameScale,
      framePosition: input.framePosition,
      canvasPresetId: input.canvasPresetId,
      createdAt,
      updatedAt: now,
    };

    await persistProjectData(serialized);

    const meta: ProjectMeta = {
      id: input.id,
      name: input.sessionName,
      templateId: input.templateId,
      thumbnailUri,
      createdAt,
      updatedAt: now,
    };

    const updatedProjects = [meta, ...currentProjects.filter((project) => project.id !== input.id)].sort(
      (a, b) => b.updatedAt - a.updatedAt
    );

    set({ projects: updatedProjects });
    await writeProjectList(updatedProjects);
  },

  loadProject: async (id) => {
    const [projects, serialized] = await Promise.all([readProjectList(), readProjectData(id)]);
    if (!serialized) return null;

    const meta = projects.find((project) => project.id === id);
    const thumbnailFile = projectThumbnailFile(id);

    return {
      id,
      name: meta?.name ?? serialized.sessionName,
      templateId: serialized.templateId,
      sessionName: serialized.sessionName,
      layers: serialized.layers,
      background: serialized.background,
      selectedFrameId: serialized.selectedFrameId,
      frameScale: serialized.frameScale,
      framePosition: serialized.framePosition,
      canvasPresetId: serialized.canvasPresetId,
      thumbnailUri: meta?.thumbnailUri ?? (thumbnailFile.exists ? thumbnailFile.uri : undefined),
      createdAt: meta?.createdAt ?? serialized.createdAt,
      updatedAt: meta?.updatedAt ?? serialized.updatedAt,
    };
  },

  deleteProject: async (id) => {
    try {
      const dir = new Directory(projectsRootDir(), id);
      if (dir.exists) {
        dir.delete();
      }
    } catch {
      // ignore local cleanup errors
    }

    const updatedProjects = get().projects.filter((project) => project.id !== id);
    set({ projects: updatedProjects });
    await writeProjectList(updatedProjects);
  },
}));
