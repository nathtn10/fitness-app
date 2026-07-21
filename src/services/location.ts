/**
 * Thin wrapper around expo-location.
 *
 * Isolates all native location access behind a small, typed surface so the
 * rest of the app never imports expo-location directly. Everything fails soft:
 * if permission is denied or the platform errors, callers get `false`/`null`
 * rather than a thrown exception.
 *
 * Privacy note (see SECURITY.md): this requests only *foreground* location and
 * never streams coordinates off the device. Detection runs locally.
 */
import * as Location from 'expo-location';
import type { GeoCoordinate } from '../domain/gym/types';

export async function requestForegroundPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function hasForegroundPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function getCurrentCoordinate(): Promise<GeoCoordinate | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch {
    return null;
  }
}

export interface LocationSubscription {
  remove: () => void;
}

/**
 * Watch foreground location, invoking `onChange` with each reading. Returns a
 * subscription whose `remove()` stops watching. Returns null if watching could
 * not be started.
 */
export async function watchCoordinate(
  onChange: (coord: GeoCoordinate) => void,
): Promise<LocationSubscription | null> {
  try {
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15_000,
        distanceInterval: 25,
      },
      (pos) => {
        onChange({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
    );
    return { remove: () => sub.remove() };
  } catch {
    return null;
  }
}
