/**
 * IndexedDB service for offline-first image storage
 * Uses idb library for robust IndexedDB operations
 */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "usverse-diary";
const DB_VERSION = 1;
const STORE_NAME = "diary-images";

export interface DiaryImageRecord {
  id: string;
  noteId: string;
  blob: Blob;
  caption: string;
  uploadedToCloud: boolean;
  createdAt: number;
  syncedAt?: number;
}

let dbInstance: IDBPDatabase | null = null;

/**
 * Initialize IndexedDB
 */
async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("noteId", "noteId", { unique: false });
        store.createIndex("uploadedToCloud", "uploadedToCloud", { unique: false });
      }
    },
  });

  return dbInstance;
}

/**
 * Store an image in IndexedDB
 */
export async function storeImage(
  id: string,
  noteId: string,
  blob: Blob,
  caption: string = ""
): Promise<void> {
  const db = await getDB();
  const record: DiaryImageRecord = {
    id,
    noteId,
    blob,
    caption,
    uploadedToCloud: false,
    createdAt: Date.now(),
  };
  await db.put(STORE_NAME, record);
}

/**
 * Get all images for a note
 */
export async function getImagesByNoteId(noteId: string): Promise<DiaryImageRecord[]> {
  const db = await getDB();
  const index = db.transaction(STORE_NAME).store.index("noteId");
  return await index.getAll(noteId);
}

/**
 * Get a specific image
 */
export async function getImage(id: string): Promise<DiaryImageRecord | undefined> {
  const db = await getDB();
  return await db.get(STORE_NAME, id);
}

/**
 * Update image caption
 */
export async function updateImageCaption(id: string, caption: string): Promise<void> {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  if (record) {
    record.caption = caption;
    await db.put(STORE_NAME, record);
  }
}

/**
 * Mark image as synced to cloud
 */
export async function markImageAsSynced(id: string): Promise<void> {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  if (record) {
    record.uploadedToCloud = true;
    record.syncedAt = Date.now();
    await db.put(STORE_NAME, record);
  }
}

/**
 * Delete an image
 */
export async function deleteImage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Delete all images for a note
 */
export async function deleteImagesByNoteId(noteId: string): Promise<void> {
  const images = await getImagesByNoteId(noteId);
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await Promise.all([
    ...images.map((img) => tx.store.delete(img.id)),
    tx.done,
  ]);
}

/**
 * Get all unsynced images (for future sync functionality)
 */
export async function getUnsyncedImages(): Promise<DiaryImageRecord[]> {
  const db = await getDB();
  const index = db.transaction(STORE_NAME).store.index("uploadedToCloud");
  return await index.getAll(false);
}

/**
 * Convert Blob to data URL for display
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert data URL to Blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
