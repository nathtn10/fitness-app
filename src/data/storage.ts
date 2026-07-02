/**
 * Thin, typed wrapper around AsyncStorage for JSON values.
 *
 * Keeping persistence behind this module means the rest of the app never
 * touches AsyncStorage directly, which makes it easy to swap in SQLite or a
 * remote sync backend later without changing call sites.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`storage.readJSON failed for "${key}":`, err);
    return fallback;
  }
}

export async function writeJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`storage.writeJSON failed for "${key}":`, err);
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn(`storage.removeKey failed for "${key}":`, err);
  }
}
