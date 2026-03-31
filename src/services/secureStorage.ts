import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function metaKey(key: string): string {
  return `${key}__meta`;
}

function chunkKey(key: string, index: number): string {
  return `${key}__chunk_${index}`;
}

async function clearChunks(key: string) {
  const rawMeta = await SecureStore.getItemAsync(metaKey(key));
  const partCount = rawMeta ? Number.parseInt(rawMeta, 10) : 0;

  if (Number.isFinite(partCount) && partCount > 0) {
    await Promise.all(
      Array.from({ length: partCount }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index), secureStoreOptions)
      )
    );
  }

  await SecureStore.deleteItemAsync(metaKey(key), secureStoreOptions);
}

export async function setSecureJson(key: string, value: unknown) {
  const payload = JSON.stringify(value);
  const parts = Math.max(1, Math.ceil(payload.length / CHUNK_SIZE));

  await clearChunks(key);

  await Promise.all(
    Array.from({ length: parts }, (_, index) => {
      const start = index * CHUNK_SIZE;
      const chunk = payload.slice(start, start + CHUNK_SIZE);
      return SecureStore.setItemAsync(chunkKey(key, index), chunk, secureStoreOptions);
    })
  );

  await SecureStore.setItemAsync(metaKey(key), String(parts), secureStoreOptions);
}

export async function getSecureJson<T>(key: string): Promise<T | null> {
  const rawMeta = await SecureStore.getItemAsync(metaKey(key));
  if (!rawMeta) return null;

  const partCount = Number.parseInt(rawMeta, 10);
  if (!Number.isFinite(partCount) || partCount <= 0) return null;

  const chunks = await Promise.all(
    Array.from({ length: partCount }, (_, index) =>
      SecureStore.getItemAsync(chunkKey(key, index))
    )
  );

  if (chunks.some((chunk) => chunk == null)) return null;
  return JSON.parse(chunks.join('')) as T;
}

export async function deleteSecureJson(key: string) {
  await clearChunks(key);
}
