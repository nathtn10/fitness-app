/**
 * Progress-photo import pipeline.
 *
 * Privacy is the whole point here (see SECURITY.md), so importing a photo:
 *   1. picks WITHOUT reading EXIF (`exif: false`);
 *   2. re-encodes it via image-manipulator, which drops ALL metadata including
 *      any embedded GPS location; and
 *   3. writes the clean copy into app-private document storage — never the
 *      shared camera roll.
 *
 * Progress photos are among the most sensitive data in the app; nothing here
 * leaves the device.
 */
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const PHOTO_DIR = `${FileSystem.documentDirectory}progress-photos/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

/** Re-encode to strip metadata, resize for storage, and save app-privately. */
async function sanitizeAndStore(sourceUri: string, id: string): Promise<string> {
  // Re-encoding produces a fresh file with no EXIF/GPS metadata.
  const processed = await manipulateAsync(
    sourceUri,
    [{ resize: { width: 1080 } }],
    { compress: 0.8, format: SaveFormat.JPEG },
  );
  await ensureDir();
  const dest = `${PHOTO_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: processed.uri, to: dest });
  return dest;
}

/** Pick a photo from the library. Returns the stored URI, or null if cancelled. */
export async function importPhotoFromLibrary(id: string): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      exif: false,
    });
    if (result.canceled || result.assets.length === 0) return null;
    return await sanitizeAndStore(result.assets[0].uri, id);
  } catch {
    return null;
  }
}

/** Capture a photo with the camera. Returns the stored URI, or null. */
export async function capturePhoto(id: string): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      exif: false,
    });
    if (result.canceled || result.assets.length === 0) return null;
    return await sanitizeAndStore(result.assets[0].uri, id);
  } catch {
    return null;
  }
}

/** Delete a stored photo file. Best-effort; ignores missing files. */
export async function deletePhotoFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
