/** Geospatial helpers for geofencing. Pure and unit-testable. */
import { haversineMeters } from '../geo';
import type { GeoCoordinate, Gym } from './types';

export { haversineMeters };

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
