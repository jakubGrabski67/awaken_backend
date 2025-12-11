/**
 * Prosty storage w pamięci na przesłane pliki IDML.
 * - Przechowuje: Buffer + meta (nazwa, rozmiar, timestamp).
 * - Limit liczby plików sterowany env STORAGE_MAX_FILES.
 */

export type StoredFile = {
  buf: Buffer;
  name: string;
  size: number;
  createdAt: number;
};

const store = new Map<string, StoredFile>();

const MAX_FILES = Math.max(1, Number(process.env.STORAGE_MAX_FILES ?? 100));

export function putFile(fileId: string, buf: Buffer, originalName: string) {
  const now = Date.now();

  store.set(fileId, {
    buf,
    name: originalName,
    size: buf.length,
    createdAt: now,
  });

  if (store.size > MAX_FILES) {
    const entries = Array.from(store.entries());
    entries
      .sort((a, b) => a[1].createdAt - b[1].createdAt)
      .slice(0, store.size - MAX_FILES)
      .forEach(([key]) => store.delete(key));
  }
}

export function getFile(fileId: string): StoredFile {
  const v = store.get(fileId);
  if (!v) {
    const e = new Error("File not found");
    (e as any).status = 404;
    throw e;
  }
  return v;
}

/** istnienie pliku */
export function hasFile(fileId: string): boolean {
  return store.has(fileId);
}

export function removeFile(fileId: string): void {
  store.delete(fileId);
}

/** Meta-dane wszystkich plików -> najnowsze najpierw */
export function listFiles(): Array<{
  id: string;
  name: string;
  size: number;
  createdAt: number;
}> {
  return Array.from(store.entries())
    .map(([id, { name, size, createdAt }]) => ({ id, name, size, createdAt }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Czyszczenie storage */
export function clear(): void {
  store.clear();
}

export function stats(): {
  count: number;
  totalBytes: number;
  oldestAt: number | null;
  newestAt: number | null;
  maxFiles: number;
} {
  let totalBytes = 0;
  let oldestAt: number | null = null;
  let newestAt: number | null = null;

  for (const { size, createdAt } of store.values()) {
    totalBytes += size;
    if (oldestAt === null || createdAt < oldestAt) oldestAt = createdAt;
    if (newestAt === null || createdAt > newestAt) newestAt = createdAt;
  }

  return {
    count: store.size,
    totalBytes,
    oldestAt,
    newestAt,
    maxFiles: MAX_FILES,
  };
}
