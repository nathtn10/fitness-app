/**
 * Cardio personal records and achievements.
 *
 * Records are tracked per activity type (a running PR isn't a cycling PR).
 * "Fastest pace" uses each activity's average pace over activities of at least
 * 1 km, which is an honest whole-activity best without rolling-window analysis.
 */
import type { Activity, ActivityType } from './types';

export interface ActivityRecords {
  type: ActivityType;
  longestDistanceMeters: number;
  longestMovingSeconds: number;
  mostElevationMeters: number;
  /** Best (lowest) average pace in sec/km over any activity >= 1km. 0 = none. */
  bestPaceSecPerKm: number;
}

const MIN_PACE_DISTANCE_M = 1000;

function emptyRecords(type: ActivityType): ActivityRecords {
  return {
    type,
    longestDistanceMeters: 0,
    longestMovingSeconds: 0,
    mostElevationMeters: 0,
    bestPaceSecPerKm: 0,
  };
}

function fold(records: ActivityRecords, activity: Activity): void {
  const m = activity.metrics;
  if (m.distanceMeters > records.longestDistanceMeters) {
    records.longestDistanceMeters = m.distanceMeters;
  }
  if (m.movingSeconds > records.longestMovingSeconds) {
    records.longestMovingSeconds = m.movingSeconds;
  }
  if (m.elevationGainMeters > records.mostElevationMeters) {
    records.mostElevationMeters = m.elevationGainMeters;
  }
  if (
    m.distanceMeters >= MIN_PACE_DISTANCE_M &&
    m.avgPaceSecPerKm > 0 &&
    (records.bestPaceSecPerKm === 0 ||
      m.avgPaceSecPerKm < records.bestPaceSecPerKm)
  ) {
    records.bestPaceSecPerKm = m.avgPaceSecPerKm;
  }
}

/** Compute best-ever records per activity type. */
export function computeCardioRecords(
  activities: Activity[],
): Map<ActivityType, ActivityRecords> {
  const byType = new Map<ActivityType, ActivityRecords>();
  for (const activity of activities) {
    let records = byType.get(activity.type);
    if (!records) {
      records = emptyRecords(activity.type);
      byType.set(activity.type, records);
    }
    fold(records, activity);
  }
  return byType;
}

export type CardioPRKind =
  | 'longestDistance'
  | 'longestDuration'
  | 'mostElevation'
  | 'fastestPace';

export interface NewCardioPR {
  type: ActivityType;
  kind: CardioPRKind;
  previous: number;
  current: number;
}

/**
 * Detect records set in `activity` relative to `history` (which must NOT
 * include `activity`).
 */
export function detectNewCardioPRs(
  activity: Activity,
  history: Activity[],
): NewCardioPR[] {
  const prior =
    computeCardioRecords(history).get(activity.type) ??
    emptyRecords(activity.type);
  const m = activity.metrics;
  const prs: NewCardioPR[] = [];

  if (m.distanceMeters > prior.longestDistanceMeters) {
    prs.push({
      type: activity.type,
      kind: 'longestDistance',
      previous: prior.longestDistanceMeters,
      current: m.distanceMeters,
    });
  }
  if (m.movingSeconds > prior.longestMovingSeconds) {
    prs.push({
      type: activity.type,
      kind: 'longestDuration',
      previous: prior.longestMovingSeconds,
      current: m.movingSeconds,
    });
  }
  if (m.elevationGainMeters > prior.mostElevationMeters) {
    prs.push({
      type: activity.type,
      kind: 'mostElevation',
      previous: prior.mostElevationMeters,
      current: m.elevationGainMeters,
    });
  }
  if (
    m.distanceMeters >= MIN_PACE_DISTANCE_M &&
    m.avgPaceSecPerKm > 0 &&
    (prior.bestPaceSecPerKm === 0 || m.avgPaceSecPerKm < prior.bestPaceSecPerKm)
  ) {
    prs.push({
      type: activity.type,
      kind: 'fastestPace',
      previous: prior.bestPaceSecPerKm,
      current: m.avgPaceSecPerKm,
    });
  }
  return prs;
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
}

/** Milestone badges derived from the full activity history. */
export function computeAchievements(activities: Activity[]): Achievement[] {
  const earned: Achievement[] = [];
  if (activities.length === 0) return earned;

  const totalKm =
    activities.reduce((sum, a) => sum + a.metrics.distanceMeters, 0) / 1000;
  const longestKm =
    Math.max(...activities.map((a) => a.metrics.distanceMeters)) / 1000;
  const totalElevation = activities.reduce(
    (sum, a) => sum + a.metrics.elevationGainMeters,
    0,
  );

  if (activities.length >= 1) {
    earned.push({
      id: 'first-activity',
      title: 'First activity 🎉',
      detail: 'You logged your first GPS activity.',
    });
  }
  if (longestKm >= 5) {
    earned.push({
      id: '5k-club',
      title: '5K club',
      detail: 'Completed a single activity of 5 km or more.',
    });
  }
  if (longestKm >= 10) {
    earned.push({
      id: '10k-club',
      title: '10K club',
      detail: 'Completed a single activity of 10 km or more.',
    });
  }
  if (totalKm >= 100) {
    earned.push({
      id: '100km-total',
      title: 'Century of kilometers',
      detail: 'Covered 100 km total across all activities.',
    });
  }
  if (totalElevation >= 1000) {
    earned.push({
      id: 'everest-base',
      title: 'Climber',
      detail: 'Accumulated 1,000 m of total elevation gain.',
    });
  }
  return earned;
}
