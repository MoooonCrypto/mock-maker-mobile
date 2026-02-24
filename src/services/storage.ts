import { File, Directory, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const PROJECTS_DIR_NAME = 'projects';

function getProjectsDir(): Directory {
  return new Directory(Paths.document, PROJECTS_DIR_NAME);
}

export function ensureProjectsDir() {
  const dir = getProjectsDir();
  if (!dir.exists) {
    dir.create();
  }
}

export function saveImageToFile(
  base64Data: string,
  filename: string,
  format: 'png' | 'jpg' = 'png'
): string {
  ensureProjectsDir();
  const ext = format === 'jpg' ? 'jpg' : 'png';
  const file = new File(getProjectsDir(), `${filename}.${ext}`);

  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  file.write(cleanBase64, { encoding: 'base64' });
  return file.uri;
}

export async function saveToMediaLibrary(fileUri: string): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return false;
    await MediaLibrary.saveToLibraryAsync(fileUri);
    return true;
  } catch {
    return false;
  }
}
