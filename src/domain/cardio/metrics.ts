/**
 * Activity metric computation from a GPS track.
 *
 * All functions are pure and operate on recorded track points, so distance,
 * pace, elevation, splits, and calorie estimates are fully unit-testable
 * without a device. Calorie figures are MET-based estimates and documented as
 * such — they are not medical-grade.
 */
import { haversineMeters } from '../geo';
import type {
  ActivityMetrics,
  ActivityType,
  Split,
  TrackPoint,
} from './types';

/** Below this speed we treat the athlete as paused (excluded from moving time). */
const MIN_MOVING_SPEED_MPS = 0.5;
/** Altitude changes smaller than this are treated as GPS noise. */
const ELEVATION_NOISE_M = 1.0;
const DEFAULT_WEIGHT_KG = 70;

function seconds(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 1000;
}

/** Total track distance in meters (sum of segment great-circle distances). */
export function totalDistanceMeters(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

/** Wall-clock elapsed time from first to last point, in seconds. */
export function elapsedSeconds(points: TrackPoint[]): number {
  if (points.length < 2) return 0;
  return Math.max(0, seconds(points[0].timestamp, points[points.length - 1].timestamp));
}

/** Time spent actually moving (segments above the pause threshold), in seconds. */
export function movingSeconds(points: TrackPoint[]): number {
  let moving = 0;
  for (let i = 1; i < points.length; i++) {
    const dt = seconds(points[i - 1].timestamp, points[i].timestamp);
    if (dt <= 0) continue;
    const dd = haversineMeters(points[i - 1], points[i]);
    if (dd / dt >= MIN_MOVING_SPEED_MPS) moving += dt;
  }
  return moving;
}

/** Total positive elevation gain in meters, with small-noise filtering. */
export function elevationGainMeters(points: TrackPoint[]): number {
  let gain = 0;
  let baseline: number | undefined;
  for (const p of points) {
    if (p.altitude == null) continue;
    if (baseline == null) {
      baseline = p.altitude;
      continue;
    }
    const diff = p.altitude - baseline;
    if (Math.abs(diff) >= ELEVATION_NOISE_M) {
      if (diff > 0) gain += diff;
      baseline = p.altitude;
    }
  }
  return gain;
}

/**
 * MET (metabolic equivalent) estimate for an activity type at a given speed.
 * Values are approximations from published MET tables, interpolated by speed.
 */
export function estimateMET(type: ActivityType, speedKmh: number): number {
  switch (type) {
    case 'run':
      return Math.max(6, speedKmh * 1.0);
    case 'ride':
      return Math.max(4, speedKmh * 0.4);
    case 'hike':
      return Math.max(5, speedKmh * 1.2);
    case 'walk':
    default:
      return Math.min(6.5, Math.max(2.5, speedKmh * 1.0));
  }
}

/**
 * Estimated calories (kcal) via MET x weight x hours.
 * @param movingSecs Time moving (calories accrue while active).
 */
export function estimateCalories(
  type: ActivityType,
  distanceMeters: number,
  movingSecs: number,
  weightKg = DEFAULT_WEIGHT_KG,
): number {
  if (movingSecs <= 0) return 0;
  const speedKmh = distanceMeters / 1000 / (movingSecs / 3600);
  const met = estimateMET(type, speedKmh);
  return Math.round(met * weightKg * (movingSecs / 3600));
}

/** Compute the full metric set for an activity's track. */
export function computeMetrics(
  points: TrackPoint[],
  type: ActivityType,
  weightKg = DEFAULT_WEIGHT_KG,
): ActivityMetrics {
  const distanceMeters = totalDistanceMeters(points);
  const moving = movingSeconds(points);
  const elapsed = elapsedSeconds(points);
  const distanceKm = distanceMeters / 1000;
  const avgSpeedKmh = moving > 0 ? distanceKm / (moving / 3600) : 0;
  const avgPaceSecPerKm = distanceKm > 0 ? moving / distanceKm : 0;

  return {
    distanceMeters,
    movingSeconds: moving,
    elapsedSeconds: elapsed,
    elevationGainMeters: elevationGainMeters(points),
    avgPaceSecPerKm,
    avgSpeedKmh,
    calories: estimateCalories(type, distanceMeters, moving, weightKg),
  };
}

/**
 * Per-distance splits (default every 1 km). Time is allocated to the split in
 * which each track segment falls; segments that straddle a boundary are split
 * proportionally by distance.
 */
export function computeSplits(
  points: TrackPoint[],
  splitMeters = 1000,
): Split[] {
  const splits: Split[] = [];
  let splitIndex = 1;
  let splitDist = 0;
  let splitTime = 0;

  const pushSplit = () => {
    splits.push({
      index: splitIndex,
      distanceMeters: splitDist,
      durationSeconds: splitTime,
      paceSecPerKm: splitDist > 0 ? splitTime / (splitDist / 1000) : 0,
    });
    splitIndex += 1;
    splitDist = 0;
    splitTime = 0;
  };

  for (let i = 1; i < points.length; i++) {
    let segDist = haversineMeters(points[i - 1], points[i]);
    let segTime = Math.max(0, seconds(points[i - 1].timestamp, points[i].timestamp));

    // Consume this segment, closing splits as we cross boundaries.
    while (splitDist + segDist >= splitMeters) {
      const remaining = splitMeters - splitDist;
      const frac = segDist > 0 ? remaining / segDist : 0;
      splitDist += remaining;
      splitTime += segTime * frac;
      pushSplit();
      segDist -= remaining;
      segTime -= segTime * frac;
    }
    splitDist += segDist;
    splitTime += segTime;
  }

  // Trailing partial split.
  if (splitDist > 1) pushSplit();
  return splits;
}
