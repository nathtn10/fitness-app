/** Persistence for progress-photo records (metadata only; files live on disk). */
import type { ProgressPhoto } from '../domain/photos/types';
import { readJSON, writeJSON } from './storage';

const PHOTOS_KEY = 'fitness.progressPhotos.v1';

export async function loadPhotos(): Promise<ProgressPhoto[]> {
  return readJSON<ProgressPhoto[]>(PHOTOS_KEY, []);
}

export async function savePhotos(photos: ProgressPhoto[]): Promise<void> {
  await writeJSON(PHOTOS_KEY, photos);
}
