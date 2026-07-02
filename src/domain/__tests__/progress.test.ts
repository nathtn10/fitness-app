import {
  oneRepMaxTrend,
  sessionsInLastDays,
  weeklyVolume,
} from '../strength/progress';
import { isoWeekKey, toISODate } from '../dates';
import { makeLog, makeSession, makeSet } from './factories';

describe('weeklyVolume', () => {
  it('buckets sessions by ISO week and sums volume', () => {
    const sessions = [
      makeSession('2026-06-01T10:00:00Z', [
        makeLog('back-squat', [makeSet({ weight: 100, reps: 5 })]),
      ]),
      makeSession('2026-06-03T10:00:00Z', [
        makeLog('back-squat', [makeSet({ weight: 100, reps: 5 })]),
      ]),
      makeSession('2026-06-15T10:00:00Z', [
        makeLog('back-squat', [makeSet({ weight: 100, reps: 5 })]),
      ]),
    ];
    const points = weeklyVolume(sessions);
    // First two are the same ISO week, third is a later week.
    expect(points).toHaveLength(2);
    expect(points[0].volume).toBe(1000);
    expect(points[0].sessions).toBe(2);
    expect(points[1].volume).toBe(500);
    // Sorted oldest-first.
    expect(points[0].week.localeCompare(points[1].week)).toBeLessThan(0);
  });
});

describe('oneRepMaxTrend', () => {
  it('returns the best estimated 1RM per day, oldest first', () => {
    const sessions = [
      makeSession('2026-06-10T10:00:00Z', [
        makeLog('bench', [makeSet({ weight: 100, reps: 5 })]),
      ]),
      makeSession('2026-06-01T10:00:00Z', [
        makeLog('bench', [
          makeSet({ weight: 90, reps: 5 }),
          makeSet({ weight: 95, reps: 5 }), // best of the day
        ]),
      ]),
    ];
    const trend = oneRepMaxTrend(sessions, 'bench');
    expect(trend).toHaveLength(2);
    expect(trend[0].date).toBe('2026-06-01');
    expect(trend[1].date).toBe('2026-06-10');
    expect(trend[1].estimatedOneRepMax).toBeGreaterThan(
      trend[0].estimatedOneRepMax,
    );
  });
});

describe('sessionsInLastDays', () => {
  it('keeps only sessions within the window', () => {
    const now = new Date('2026-06-30T12:00:00Z');
    const sessions = [
      makeSession('2026-06-29T10:00:00Z', []),
      makeSession('2026-06-20T10:00:00Z', []),
      makeSession('2026-05-01T10:00:00Z', []),
    ];
    const recent = sessionsInLastDays(sessions, 7, now);
    expect(recent).toHaveLength(1);
    expect(toISODate(recent[0].startedAt)).toBe('2026-06-29');
  });
});

describe('isoWeekKey', () => {
  it('is stable within a week and changes across weeks', () => {
    expect(isoWeekKey('2026-06-01T00:00:00Z')).toBe(
      isoWeekKey('2026-06-03T00:00:00Z'),
    );
    expect(isoWeekKey('2026-06-01T00:00:00Z')).not.toBe(
      isoWeekKey('2026-06-15T00:00:00Z'),
    );
  });
});
