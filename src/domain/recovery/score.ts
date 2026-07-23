/**
 * Recovery / readiness score.
 *
 * A transparent training-load model computed from data the app already has —
 * strength sessions and cardio activities — so it works today without HealthKit
 * sleep/HR (those can refine it later). It blends three well-established ideas:
 *
 *   - Acute:Chronic Workload Ratio (ACWR): this week's load vs. the recent
 *     4-week average. Ratios well above 1 mean you've ramped up faster than
 *     you've adapted — fatigue and injury risk rise (Gabbett).
 *   - Training monotony: repetitive day-to-day load without variation drives
 *     accumulated strain (Foster).
 *   - Rest: days since the last session.
 *
 * Every input contributes an explainable factor, so the score is never a
 * black box.
 */
import { toISODate } from '../dates';
import type { Activity } from '../cardio/types';
import { sessionWorkingSets } from '../strength/volume';
import type { WorkoutSession } from '../types';

/** Cardio load per moving-minute, in strength-set-equivalent units. */
const CARDIO_LOAD_PER_MIN = 0.7;
const ACUTE_DAYS = 7;
const CHRONIC_DAYS = 28;

export type ReadinessLevel =
  | 'ready'
  | 'primed'
  | 'good'
  | 'moderate'
  | 'fatigued';

export interface ReadinessFactor {
  label: string;
  detail: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface Readiness {
  /** 0-100; higher means more recovered / readier to train hard. */
  score: number;
  level: ReadinessLevel;
  /** Acute:chronic workload ratio, or undefined without enough history. */
  acwr?: number;
  /** Whole days since the last training session (strength or cardio). */
  restDays: number;
  factors: ReadinessFactor[];
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Total training load per calendar day for the last `days` days (oldest first). */
export function dailyLoads(
  sessions: WorkoutSession[],
  activities: Activity[],
  now: Date,
  days: number,
): number[] {
  const byDate = new Map<string, number>();
  const add = (iso: string, load: number) =>
    byDate.set(iso, (byDate.get(iso) ?? 0) + load);

  for (const s of sessions) add(toISODate(s.startedAt), sessionWorkingSets(s));
  for (const a of activities) {
    add(toISODate(a.startedAt), (a.metrics.movingSeconds / 60) * CARDIO_LOAD_PER_MIN);
  }

  const loads: number[] = [];
  const todayStart = startOfDay(now);
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(todayStart - i * 86400000);
    loads.push(byDate.get(toISODate(date)) ?? 0);
  }
  return loads;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function levelForScore(score: number): ReadinessLevel {
  if (score >= 85) return 'primed';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  return 'fatigued';
}

/** Compute a readiness snapshot from training history. */
export function computeReadiness(
  sessions: WorkoutSession[],
  activities: Activity[],
  now: Date,
): Readiness {
  const loads = dailyLoads(sessions, activities, now, CHRONIC_DAYS);
  const chronicWeekly = (loads.reduce((a, b) => a + b, 0) / CHRONIC_DAYS) * 7;
  const acute = loads.slice(-ACUTE_DAYS).reduce((a, b) => a + b, 0);

  // Days since last training.
  let restDays = CHRONIC_DAYS;
  for (let i = loads.length - 1; i >= 0; i--) {
    if (loads[i] > 0) {
      restDays = loads.length - 1 - i;
      break;
    }
  }

  const factors: ReadinessFactor[] = [];

  // No meaningful history: you're rested, but we say so honestly.
  if (chronicWeekly <= 0) {
    return {
      score: 90,
      level: 'ready',
      restDays,
      factors: [
        {
          label: 'Well rested',
          detail: 'Not enough recent training to detect fatigue. Good day to train.',
          impact: 'positive',
        },
      ],
    };
  }

  const acwr = acute / chronicWeekly;
  let score = 100;

  if (acwr > 1.5) {
    score -= 30;
    factors.push({
      label: 'High training load',
      detail: `This week's load is well above your norm (ACWR ${acwr.toFixed(
        2,
      )}). Fatigue and injury risk are elevated.`,
      impact: 'negative',
    });
  } else if (acwr > 1.3) {
    score -= 15;
    factors.push({
      label: 'Elevated load',
      detail: `Load is ramping up (ACWR ${acwr.toFixed(2)}). Watch recovery.`,
      impact: 'negative',
    });
  } else if (acwr >= 0.8) {
    factors.push({
      label: 'Balanced load',
      detail: `Training load is in the sweet spot (ACWR ${acwr.toFixed(2)}).`,
      impact: 'positive',
    });
  } else {
    factors.push({
      label: 'Fresh',
      detail: `Recent load is light (ACWR ${acwr.toFixed(
        2,
      )}). You're well recovered.`,
      impact: 'positive',
    });
  }

  // Monotony: high daily-load sameness compounds strain.
  const week = loads.slice(-ACUTE_DAYS);
  const sd = stdDev(week);
  const monotony = sd > 0 ? mean(week) / sd : mean(week) > 0 ? 3 : 0;
  if (monotony > 2) {
    score -= 15;
    factors.push({
      label: 'Repetitive training',
      detail:
        'Very little day-to-day variation in load. Vary intensity or add a rest day.',
      impact: 'negative',
    });
  }

  // Recent hard day vs. accrued rest.
  if (restDays === 0) {
    score -= 10;
    factors.push({
      label: 'Trained today',
      detail: 'You already trained today — prioritize food and sleep to recover.',
      impact: 'negative',
    });
  } else if (restDays >= 2) {
    score = Math.min(100, score + 5);
    factors.push({
      label: `${restDays} rest days`,
      detail: 'You’ve had time to recover since your last session.',
      impact: 'positive',
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, level: levelForScore(score), acwr, restDays, factors };
}

export function readinessHeadline(level: ReadinessLevel): string {
  switch (level) {
    case 'primed':
      return 'Primed to train 🔥';
    case 'good':
      return 'Good to go 💪';
    case 'moderate':
      return 'Train with care ⚖️';
    case 'fatigued':
      return 'Prioritize recovery 😴';
    default:
      return 'Well rested ✨';
  }
}
