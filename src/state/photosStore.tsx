/**
 * Progress-photo state: the list of photos (metadata) with import/delete.
 * Files are imported through the privacy-preserving photos service; this store
 * only tracks records and keeps them sorted newest-first.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { loadPhotos, savePhotos } from '../data/photosRepository';
import type { ProgressPhoto } from '../domain/photos/types';
import { createId } from '../lib/id';
import {
  capturePhoto,
  deletePhotoFile,
  importPhotoFromLibrary,
} from '../services/photos';

interface PhotosStoreValue {
  loading: boolean;
  photos: ProgressPhoto[];
  addFromLibrary: (bodyweightKg?: number) => Promise<boolean>;
  addFromCamera: (bodyweightKg?: number) => Promise<boolean>;
  deletePhoto: (id: string) => void;
}

const PhotosContext = createContext<PhotosStoreValue | null>(null);

export function PhotosProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadPhotos();
      if (cancelled) return;
      setPhotos(loaded);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: ProgressPhoto[]) => {
    setPhotos(next);
    void savePhotos(next);
  }, []);

  const addPhoto = useCallback(
    async (
      importer: (id: string) => Promise<string | null>,
      bodyweightKg?: number,
    ): Promise<boolean> => {
      const id = createId('photo');
      const uri = await importer(id);
      if (!uri) return false;
      const photo: ProgressPhoto = {
        id,
        uri,
        takenAt: new Date().toISOString(),
        bodyweightKg,
      };
      // Insert sorted newest-first.
      setPhotos((prev) => {
        const next = [photo, ...prev].sort(
          (a, b) =>
            new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
        );
        void savePhotos(next);
        return next;
      });
      return true;
    },
    [],
  );

  const addFromLibrary = useCallback(
    (bodyweightKg?: number) => addPhoto(importPhotoFromLibrary, bodyweightKg),
    [addPhoto],
  );
  const addFromCamera = useCallback(
    (bodyweightKg?: number) => addPhoto(capturePhoto, bodyweightKg),
    [addPhoto],
  );

  const deletePhoto = useCallback(
    (id: string) => {
      const target = photos.find((p) => p.id === id);
      if (target) void deletePhotoFile(target.uri);
      persist(photos.filter((p) => p.id !== id));
    },
    [photos, persist],
  );

  const value = useMemo<PhotosStoreValue>(
    () => ({ loading, photos, addFromLibrary, addFromCamera, deletePhoto }),
    [loading, photos, addFromLibrary, addFromCamera, deletePhoto],
  );

  return (
    <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>
  );
}

export function usePhotos(): PhotosStoreValue {
  const ctx = useContext(PhotosContext);
  if (!ctx) throw new Error('usePhotos must be used within a PhotosProvider');
  return ctx;
}
