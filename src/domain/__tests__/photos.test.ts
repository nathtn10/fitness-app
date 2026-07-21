import { comparePhotos } from '../photos/compare';
import type { ProgressPhoto } from '../photos/types';
import { makeLog, makeSession, makeSet } from './factories';

function photo(
  takenAt: string,
  bodyweightKg?: number,
): ProgressPhoto {
  return { id: takenAt, uri: `file://${takenAt}.jpg`, takenAt, bodyweightKg };
}

describe('comparePhotos', () => {
  const sessions = [
    makeSession('2026-05-01T10:00:00Z', [
      makeLog('back-squat', [makeSet({ weight: 100, reps: 5 })]),
    ]),
    makeSession('2026-06-01T10:00:00Z', [
      makeLog('back-squat', [makeSet({ weight: 120, reps: 5 })]),
    ]),
  ];

  it('computes days between and weight delta', () => {
    const cmp = comparePhotos(
      photo('2026-05-02T10:00:00Z', 80),
      photo('2026-06-02T10:00:00Z', 78),
      sessions,
    );
    expect(cmp.days).toBe(31);
    expect(cmp.weightDeltaKg).toBe(-2);
  });

  it('orders photos chronologically regardless of argument order', () => {
    const forward = comparePhotos(
      photo('2026-05-02T10:00:00Z', 80),
      photo('2026-06-02T10:00:00Z', 78),
      sessions,
    );
    const reversed = comparePhotos(
      photo('2026-06-02T10:00:00Z', 78),
      photo('2026-05-02T10:00:00Z', 80),
      sessions,
    );
    expect(reversed.weightDeltaKg).toBe(forward.weightDeltaKg);
  });

  it('surfaces estimated-1RM gains between the two dates', () => {
    const cmp = comparePhotos(
      photo('2026-05-02T10:00:00Z'),
      photo('2026-06-02T10:00:00Z'),
      sessions,
    );
    const squat = cmp.strengthChanges.find((c) => c.exerciseId === 'back-squat');
    expect(squat).toBeDefined();
    expect(squat!.delta).toBeGreaterThan(0); // 120x5 estimates higher than 100x5
  });

  it('omits weight delta when bodyweight is missing', () => {
    const cmp = comparePhotos(
      photo('2026-05-02T10:00:00Z'),
      photo('2026-06-02T10:00:00Z'),
      sessions,
    );
    expect(cmp.weightDeltaKg).toBeUndefined();
  });
});
