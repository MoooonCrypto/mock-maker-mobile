import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';
import type { Layer, Background } from '../types';
import type { FrameId } from './useEditorStore';
import { deleteSecureJson, getSecureJson, setSecureJson } from '../services/secureStorage';

const PROJECT_LIST_KEY  = 'mockmaker_project_list';
const PROJECT_DATA_PREFIX = 'mockmaker_project_data_';

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectData extends ProjectMeta {
  layers: Layer[];
  background: Background;
  selectedFrameId: FrameId;
}

interface ProjectStore {
  projects: ProjectMeta[];
  loadProjectList: () => Promise<void>;
  saveProject: (data: Omit<ProjectData, 'createdAt' | 'updatedAt'> & { createdAt?: number }) => Promise<void>;
  loadProject: (id: string) => Promise<ProjectData | null>;
  deleteProject: (id: string) => Promise<void>;
}

// ── Media file persistence ────────────────────────────────────────────────────

function mediaDir(projectId: string): Directory {
  const base = new Directory(Paths.document, 'projects');
  if (!base.exists) base.create();
  const d = new Directory(base, projectId);
  if (!d.exists) d.create();
  return d;
}

/**
 * Copy a media URI to permanent project storage if needed.
 * - ph:// (Photos asset) — already permanent, return as-is
 * - file:// in documents — already saved, return as-is
 * - anything else (temp) — copy to documents/projects/{id}/
 */
async function ensurePermanentUri(uri: string, projectId: string): Promise<string> {
  if (!uri) return uri;
  if (uri.startsWith('ph://')) return uri;
  if (uri.startsWith(Paths.document.uri)) return uri;

  try {
    const dir = mediaDir(projectId);
    const filename = uri.split('/').pop() ?? `media_${Date.now()}`;
    const dest = new File(dir, filename);
    if (!dest.exists) {
      const src = new File(uri);
      if (src.exists) src.copy(dest);
    }
    return dest.exists ? dest.uri : uri;
  } catch {
    return uri; // fallback: use original URI
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],

  loadProjectList: async () => {
    try {
      const secureProjects = await getSecureJson<ProjectMeta[]>(PROJECT_LIST_KEY);
      if (secureProjects) {
        set({ projects: secureProjects.sort((a, b) => b.updatedAt - a.updatedAt) });
        return;
      }

      const raw = await AsyncStorage.getItem(PROJECT_LIST_KEY);
      if (!raw) return;

      const parsed: ProjectMeta[] = JSON.parse(raw);
      const sorted = parsed.sort((a, b) => b.updatedAt - a.updatedAt);
      set({ projects: sorted });
      await setSecureJson(PROJECT_LIST_KEY, sorted);
      await AsyncStorage.removeItem(PROJECT_LIST_KEY);
    } catch {
      // use empty list
    }
  },

  saveProject: async (input) => {
    const now = Date.now();
    const projectId = input.id;

    // Ensure all media URIs are permanent
    const permanentLayers: Layer[] = await Promise.all(
      input.layers.map(async (layer) => {
        if (layer.type === 'image') {
          const permanentUri = await ensurePermanentUri(layer.uri, projectId);
          return { ...layer, uri: permanentUri };
        }
        return layer;
      })
    );

    const projectData: ProjectData = {
      id: projectId,
      name: input.name,
      layers: permanentLayers,
      background: input.background,
      selectedFrameId: input.selectedFrameId,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };

    await setSecureJson(PROJECT_DATA_PREFIX + projectId, projectData);

    // Update project list
    const meta: ProjectMeta = {
      id: projectId,
      name: input.name,
      createdAt: projectData.createdAt,
      updatedAt: now,
    };
    const existing = get().projects;
    const updated = [meta, ...existing.filter((p) => p.id !== projectId)];
    set({ projects: updated });
    await setSecureJson(PROJECT_LIST_KEY, updated);
    await AsyncStorage.removeItem(PROJECT_DATA_PREFIX + projectId);
    await AsyncStorage.removeItem(PROJECT_LIST_KEY);
  },

  loadProject: async (id) => {
    try {
      const secureProject = await getSecureJson<ProjectData>(PROJECT_DATA_PREFIX + id);
      if (secureProject) return secureProject;

      const raw = await AsyncStorage.getItem(PROJECT_DATA_PREFIX + id);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as ProjectData;
      await setSecureJson(PROJECT_DATA_PREFIX + id, parsed);
      await AsyncStorage.removeItem(PROJECT_DATA_PREFIX + id);
      return parsed;
    } catch {
      return null;
    }
  },

  deleteProject: async (id) => {
    try {
      await deleteSecureJson(PROJECT_DATA_PREFIX + id);
      await AsyncStorage.removeItem(PROJECT_DATA_PREFIX + id);
      // Clean up media files
      const dir = new Directory(new Directory(Paths.document, 'projects'), id);
      if (dir.exists) dir.delete();
    } catch {
      // ignore
    }
    const updated = get().projects.filter((p) => p.id !== id);
    set({ projects: updated });
    await setSecureJson(PROJECT_LIST_KEY, updated);
    await AsyncStorage.removeItem(PROJECT_LIST_KEY);
  },
}));
