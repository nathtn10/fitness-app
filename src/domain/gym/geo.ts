/** Geospatial math for geofencing. Pure and unit-testable. */
import type { GeoCoordinate, Gym } from './types';

const EARTH_RADIUS_M = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates in meters (haversine).
 * Accurate to well within the precision needed for gym-sized geofences.
 */
export function haversineMeters(a: GeoCoordinate, b: GeoCoordinate): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Whether a coordinate is inside a gym's geofence. */
export function isWithinGym(coord: GeoCoordinate, gym: Gym): boolean {
  return haversineMeters(coord, gym) <= gym.radiusMeters;
}

/**
 * The nearest gym to a coordinate that the coordinate is actually inside, or
 * null if none. If geofences overlap, the closest center wins.
 */
export function gymAtLocation(
  coord: GeoCoordinate,
  gyms: Gym[],
): Gym | null {
  let best: Gym | null = null;
  let bestDist = Infinity;
  for (const gym of gyms) {
    const dist = haversineMeters(coord, gym);
    if (dist <= gym.radiusMeters && dist < bestDist) {
      best = gym;
      bestDist = dist;
    }
  }
  return best;
}
