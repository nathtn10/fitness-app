import {
  isWorkingSet,
  sessionVolume,
  sessionWorkingSets,
  setsPerMuscleGroup,
  setVolume,
  SECONDARY_MUSCLE_CREDIT,
} from '../strength/volume';
import { makeLog, makeSession, makeSet } from './factories';

describe('working-set classification', () => {
  it('excludes warmups, incomplete sets and zero-rep sets', () => {
    expect(isWorkingSet(makeSet())).toBe(true);
    expect(isWorkingSet(makeSet({ isWarmup: true }))).toBe(false);
    expect(isWorkingSet(makeSet({ completed: false }))).toBe(false);
    expect(isWorkingSet(makeSet({ reps: 0 }))).toBe(false);
  });
});

describe('volume load', () => {
  it('is weight x reps for a working set and 0 for warmups', () => {
    expect(setVolume(makeSet({ weight: 100, reps: 5 }))).toBe(500);
    expect(setVolume(makeSet({ weight: 100, reps: 5, isWarmup: true }))).toBe(0);
  });

  it('sums volume and working sets across a session', () => {
    const session = makeSession('2026-06-01T10:00:00Z', [
      makeLog('barbell-bench-press', [
        makeSet({ weight: 60, reps: 5, isWarmup: true }), // ignored
        makeSet({ weight: 100, reps: 5 }), // 500
        makeSet({ weight: 100, reps: 4 }), // 400
      ]),
    ]);
    expect(sessionVolume(session)).toBe(900);
    expect(sessionWorkingSets(session)).toBe(2);
  });
});

describe('sets per muscle group', () => {
  it('credits primary muscles fully and secondary muscles partially', () => {
    // Bench press: primary chest; secondary triceps, shoulders.
    const session = makeSession('2026-06-01T10:00:00Z', [
      makeLog('barbell-bench-press', [
        makeSet(),
        makeSet(),
        makeSet(),
      ]),
    ]);
    const counts = setsPerMuscleGroup(session);
    expect(counts.chest).toBe(3);
    expect(counts.triceps).toBe(3 * SECONDARY_MUSCLE_CREDIT);
    expect(counts.shoulders).toBe(3 * SECONDARY_MUSCLE_CREDIT);
  });

  it('ignores unknown exercises', () => {
    const session = makeSession('2026-06-01T10:00:00Z', [
      makeLog('does-not-exist', [makeSet()]),
    ]);
    expect(setsPerMuscleGroup(session)).toEqual({});
  });
});
