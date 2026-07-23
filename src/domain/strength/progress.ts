/**
 * Progress aggregation over time.
 *
 * These functions turn a flat list of sessions into the time series the
 * Progress screen charts: weekly volume, weekly working sets per muscle group,
 * and the estimated-1RM trend for a given exercise.
 */
import { isoWeekKey, toISODate } from '../dates';
import type { MuscleGroup, WorkoutSession } from '../types';
import { estimateOneRepMax } from './oneRepMax';
import {
  isWorkingSet,
  mergeMuscleGroupCounts,
  sessionVolume,
  setsPerMuscleGroup,
} from './volume';

export interface WeeklyVolumePoint {
  week: string;
  volume: number;
  workingSets: number;
  sessions: number;
}

/** Weekly total volume load and working-set counts, sorted oldest-first. */
export function weeklyVolume(sessions: WorkoutSession[]): WeeklyVolumePoint[] {
  const byWeek = new Map<string, WeeklyVolumePoint>();
  for (const session of sessions) {
    const week = isoWeekKey(session.startedAt);
    const point =
      byWeek.get(week) ?? { week, volume: 0, workingSets: 0, sessions: 0 };
    point.volume += sessionVolume(session);
    point.workingSets += session.exercises.reduce(
      (n, log) => n + log.sets.filter(isWorkingSet).length,
      0,
    );
    point.sessions += 1;
    byWeek.set(week, point);
  }
  return [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week));
}

export interface OneRepMaxPoint {
  date: string;
  estimatedOneRepMax: number;
}

/**
 * Best estimated 1RM per day for one exercise, oldest-first. Days with no
 * working sets for the exercise are omitted.
 */
export function oneRepMaxTrend(
  sessions: WorkoutSession[],
  exerciseId: string,
): OneRepMaxPoint[] {
  const byDate = new Map<string, number>();
  for (const session of sessions) {
    const date = toISODate(session.startedAt);
    for (const log of session.exercises) {
      if (log.exerciseId !== exerciseId) continue;
      for (const set of log.sets) {
        if (!isWorkingSet(set)) continue;
        const e1rm = estimateOneRepMax(set.weight, set.reps);
        if (e1rm > (byDate.get(date) ?? 0)) byDate.set(date, e1rm);
      }
    }
  }
  return [...byDate.entries()]
    .map(([date, estimatedOneRepMax]) => ({ date, estimatedOneRepMax }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Total working sets per muscle group across the given sessions. Callers
 * typically pass the last 7 days to compare against weekly targets.
 */
export function muscleGroupSetsInRange(
  sessions: WorkoutSession[],
): Partial<Record<MuscleGroup, number>> {
  return mergeMuscleGroupCounts(sessions.map(setsPerMuscleGroup));
}

/** Filter sessions to those started within the last `days` days of `now`. */
export function sessionsInLastDays(
  sessions: WorkoutSession[],
  days: number,
  now: Date,
): WorkoutSession[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => new Date(s.startedAt).getTime() >= cutoff);
}
