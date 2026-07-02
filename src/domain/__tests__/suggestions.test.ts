import {
  generateSuggestions,
  suggestWorkingWeight,
} from '../strength/suggestions';
import { makeLog, makeProfile, makeSession, makeSet } from './factories';
import type { SetEntry } from '../types';

const NOW = new Date('2026-06-30T12:00:00Z');

function setsOf(n: number, template: Partial<SetEntry> = {}): SetEntry[] {
  return Array.from({ length: n }, () => makeSet(template));
}

describe('generateSuggestions', () => {
  it('returns nothing for a user with no history', () => {
    expect(generateSuggestions([], makeProfile(), NOW)).toEqual([]);
  });

  it('flags neglected muscle groups and a push/pull imbalance', () => {
    // 12 hard sets of bench two days ago; nothing else all week.
    const sessions = [
      makeSession('2026-06-29T18:00:00Z', [
        makeLog('barbell-bench-press', setsOf(12, { weight: 80, reps: 8 })),
      ]),
    ];
    const result = generateSuggestions(sessions, makeProfile(), NOW);

    const undertrained = result.filter((s) => s.type === 'undertrained');
    expect(undertrained.length).toBeGreaterThan(0);
    // Chest was trained hard, so it must not be flagged as undertrained.
    expect(
      undertrained.some((s) => s.muscleGroups.includes('chest')),
    ).toBe(false);

    // Push volume without any pull work => a pull imbalance suggestion.
    const imbalance = result.filter((s) => s.type === 'imbalance');
    expect(imbalance.length).toBeGreaterThan(0);

    // Heavily worked chest in the last 2 days => recovery suggestion.
    expect(result.some((s) => s.type === 'recovery')).toBe(true);
  });

  it('detects a stalled lift when the estimated 1RM stops improving', () => {
    const sessions = ['2026-06-10', '2026-06-17', '2026-06-24'].map((d) =>
      makeSession(`${d}T10:00:00Z`, [
        makeLog('barbell-bench-press', [makeSet({ weight: 100, reps: 5 })]),
      ]),
    );
    const result = generateSuggestions(sessions, makeProfile(), NOW);
    const stalled = result.filter((s) => s.type === 'stalled');
    expect(stalled.length).toBeGreaterThan(0);
    expect(stalled[0].title).toContain('Bench');
  });

  it('ranks suggestions by priority (undertrained before recovery)', () => {
    const sessions = [
      makeSession('2026-06-29T18:00:00Z', [
        makeLog('barbell-bench-press', setsOf(12, { weight: 80, reps: 8 })),
      ]),
    ];
    const result = generateSuggestions(sessions, makeProfile(), NOW);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].priority).toBeGreaterThanOrEqual(result[i - 1].priority);
    }
  });

  it('respects custom weekly set targets from the profile', () => {
    // With a tiny chest target, a few sets should satisfy it (not undertrained).
    const sessions = [
      makeSession('2026-06-29T18:00:00Z', [
        makeLog('barbell-bench-press', setsOf(3, { weight: 80, reps: 8 })),
      ]),
    ];
    const profile = makeProfile({ weeklySetTargets: { chest: 2 } });
    const result = generateSuggestions(sessions, profile, NOW);
    expect(
      result.some(
        (s) => s.type === 'undertrained' && s.muscleGroups.includes('chest'),
      ),
    ).toBe(false);
  });
});

describe('suggestWorkingWeight', () => {
  it('suggests a lighter weight for higher target reps', () => {
    const sessions = [
      makeSession('2026-06-01T10:00:00Z', [
        makeLog('back-squat', [makeSet({ weight: 100, reps: 5 })]),
      ]),
    ];
    const forFive = suggestWorkingWeight(sessions, 'back-squat', 5)!;
    const forTen = suggestWorkingWeight(sessions, 'back-squat', 10)!;
    expect(forFive).toBeGreaterThan(forTen);
    expect(forTen).toBeGreaterThan(0);
  });

  it('returns undefined for an exercise with no history', () => {
    expect(suggestWorkingWeight([], 'back-squat', 5)).toBeUndefined();
  });
});
