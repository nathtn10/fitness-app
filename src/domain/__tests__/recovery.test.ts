import { computeReadiness, dailyLoads } from '../recovery/score';
import type { Activity } from '../cardio/types';
import { makeLog, makeSession, makeSet } from './factories';

const NOW = new Date('2026-07-20T12:00:00Z');

function trainingSession(dateIso: string, sets: number) {
  return makeSession(
    dateIso,
    [
      makeLog(
        'back-squat',
        Array.from({ length: sets }, () => makeSet({ weight: 100, reps: 5 })),
      ),
    ],
  );
}

function noActivities(): Activity[] {
  return [];
}

describe('dailyLoads', () => {
  it('buckets working sets into the right day', () => {
    const loads = dailyLoads(
      [trainingSession('2026-07-20T09:00:00', 10)],
      [],
      NOW,
      28,
    );
    expect(loads).toHaveLength(28);
    expect(loads[loads.length - 1]).toBe(10); // today
  });
});

describe('computeReadiness', () => {
  it('reports well-rested with no training history', () => {
    const r = computeReadiness([], noActivities(), NOW);
    expect(r.level).toBe('ready');
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it('lowers readiness after a sudden spike in load', () => {
    // Light chronic base, then a huge acute week => high ACWR.
    const sessions = [
      trainingSession('2026-06-27T09:00:00', 4),
      trainingSession('2026-07-18T09:00:00', 30),
      trainingSession('2026-07-19T09:00:00', 30),
      trainingSession('2026-07-20T09:00:00', 30),
    ];
    const r = computeReadiness(sessions, noActivities(), NOW);
    expect(r.acwr).toBeGreaterThan(1.5);
    expect(r.score).toBeLessThan(70);
    expect(r.factors.some((f) => f.impact === 'negative')).toBe(true);
  });

  it('rewards rest days since the last session', () => {
    const sessions = [
      trainingSession('2026-07-01T09:00:00', 12),
      trainingSession('2026-07-08T09:00:00', 12),
      trainingSession('2026-07-15T09:00:00', 12),
    ];
    const r = computeReadiness(sessions, noActivities(), NOW);
    expect(r.restDays).toBeGreaterThanOrEqual(2);
    expect(r.factors.some((f) => f.label.includes('rest days'))).toBe(true);
  });

  it('keeps the score within 0-100', () => {
    const sessions = Array.from({ length: 20 }, (_, i) =>
      trainingSession(
        new Date(NOW.getTime() - i * 86400000).toISOString(),
        40,
      ),
    );
    const r = computeReadiness(sessions, noActivities(), NOW);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
