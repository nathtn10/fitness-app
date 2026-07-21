/**
 * Gym busyness estimation from visit history.
 *
 * With on-device-first data this reflects the user's own visit patterns; the
 * same aggregation works unchanged once crowd-sourced visits from many users
 * are merged in. Busyness is expressed relative to the busiest observed slot,
 * so it stays meaningful regardless of absolute sample size.
 */
import type { GymVisit } from './types';

export type BusynessLevel = 'unknown' | 'quiet' | 'moderate' | 'busy' | 'packed';

/** counts[dayOfWeek 0-6][hour 0-23] = number of visits active in that slot. */
export type BusynessHeatmap = number[][];

const MAX_HOURS_PER_VISIT = 24; // guard against a missing departedAt

function emptyHeatmap(): BusynessHeatmap {
  return Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
}

/**
 * Build a 7x24 heatmap of how many visits were active in each day/hour slot.
 * A visit contributes to every hour it overlaps. Visits still in progress
 * (no departedAt) count for the single hour of their arrival.
 */
export function busynessHeatmap(visits: GymVisit[]): BusynessHeatmap {
  const heatmap = emptyHeatmap();
  for (const visit of visits) {
    const start = new Date(visit.arrivedAt);
    const end = visit.departedAt ? new Date(visit.departedAt) : start;
    if (Number.isNaN(start.getTime())) continue;

    // Always credit the arrival hour, then each subsequent hour the visit was
    // still in progress (strictly before departure, so a visit ending exactly
    // on an hour boundary doesn't credit the hour it leaves).
    const cursor = new Date(start);
    cursor.setMinutes(0, 0, 0);
    heatmap[cursor.getDay()][cursor.getHours()] += 1;
    cursor.setHours(cursor.getHours() + 1);
    let iterations = 0;
    while (cursor.getTime() < end.getTime() && iterations < MAX_HOURS_PER_VISIT) {
      heatmap[cursor.getDay()][cursor.getHours()] += 1;
      cursor.setHours(cursor.getHours() + 1);
      iterations += 1;
    }
  }
  return heatmap;
}

function levelFromScore(score: number): BusynessLevel {
  if (score <= 0) return 'quiet';
  if (score < 0.35) return 'quiet';
  if (score < 0.6) return 'moderate';
  if (score < 0.85) return 'busy';
  return 'packed';
}

export interface BusynessEstimate {
  level: BusynessLevel;
  /** 0-1 relative to the busiest slot ever observed for this gym. */
  score: number;
  /** Number of visits observed in the matching day/hour slot. */
  sampleSize: number;
}

/**
 * Estimate busyness at a given time from visit history. Returns 'unknown' when
 * there isn't enough data to say anything.
 */
export function estimateBusyness(
  visits: GymVisit[],
  at: Date,
): BusynessEstimate {
  const heatmap = busynessHeatmap(visits);
  let max = 0;
  for (const day of heatmap) for (const slot of day) if (slot > max) max = slot;

  if (max === 0) return { level: 'unknown', score: 0, sampleSize: 0 };

  const slot = heatmap[at.getDay()][at.getHours()];
  const score = slot / max;
  return { level: levelFromScore(score), score, sampleSize: slot };
}

export interface HourBusyness {
  hour: number;
  score: number;
}

/** Relative busyness by hour for a given weekday, for a bar/heat display. */
export function busynessByHour(
  visits: GymVisit[],
  dayOfWeek: number,
): HourBusyness[] {
  const heatmap = busynessHeatmap(visits);
  let max = 0;
  for (const day of heatmap) for (const slot of day) if (slot > max) max = slot;
  return heatmap[dayOfWeek].map((count, hour) => ({
    hour,
    score: max === 0 ? 0 : count / max,
  }));
}

export function busynessLabel(level: BusynessLevel): string {
  switch (level) {
    case 'quiet':
      return 'Quiet';
    case 'moderate':
      return 'Moderately busy';
    case 'busy':
      return 'Busy';
    case 'packed':
      return 'Packed';
    default:
      return 'Not enough data yet';
  }
}
