/** Domain types for GPS-tracked cardio / outdoor activities. */
import type { GeoPoint } from '../geo';

export type ActivityType = 'run' | 'ride' | 'walk' | 'hike';

/** A single GPS sample recorded during an activity. */
export interface TrackPoint extends GeoPoint {
  /** ISO-8601 timestamp of the sample. */
  timestamp: string;
  /** Altitude in meters, if available. */
  altitude?: number;
  /** Instantaneous speed in m/s from the GPS, if available. */
  speed?: number;
}

/** Computed metrics for an activity (derived from its track). */
export interface ActivityMetrics {
  distanceMeters: number;
  /** Time actually moving (excludes long pauses), in seconds. */
  movingSeconds: number;
  /** Total wall-clock time from start to end, in seconds. */
  elapsedSeconds: number;
  /** Total positive elevation change, in meters. */
  elevationGainMeters: number;
  /** Average pace in seconds per kilometer (0 if no distance). */
  avgPaceSecPerKm: number;
  /** Average speed in km/h. */
  avgSpeedKmh: number;
  /** Estimated energy expenditure, in kilocalories. */
  calories: number;
}

/** A per-unit-distance split (e.g. each kilometer). */
export interface Split {
  /** 1-based split index. */
  index: number;
  distanceMeters: number;
  durationSeconds: number;
  paceSecPerKm: number;
}

/** A completed or in-progress activity. */
export interface Activity {
  id: string;
  type: ActivityType;
  /** ISO-8601 start timestamp. */
  startedAt: string;
  /** ISO-8601 end timestamp, if finished. */
  endedAt?: string;
  /** Recorded GPS track. */
  points: TrackPoint[];
  /** Cached metrics computed at save time. */
  metrics: ActivityMetrics;
  title?: string;
}
