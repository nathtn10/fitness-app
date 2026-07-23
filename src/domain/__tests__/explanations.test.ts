import { getExercise } from '../exercises';
import {
  explainExercise,
  explainExerciseById,
  recommendTodayFocus,
} from '../strength/explanations';
import { makeLog, makeProfile, makeSession, makeSet } from './factories';

const NOW = new Date('2026-06-30T12:00:00Z');

describe('explainExercise', () => {
  it('returns hand-authored guidance for a primary lift', () => {
    const squat = getExercise('back-squat')!;
    const ex = explainExercise(squat);
    expect(ex.name).toBe('Back Squat');
    expect(ex.cues.length).toBeGreaterThan(0);
    expect(ex.mistakes.length).toBeGreaterThan(0);
    expect(ex.primaryMuscles).toContain('Quads');
  });

  it('composes a fallback explanation from metadata for other exercises', () => {
    const curl = getExercise('barbell-curl')!;
    const ex = explainExercise(curl);
    expect(ex.summary).toContain('Biceps');
    expect(ex.cues.length).toBeGreaterThan(0);
  });

  it('explainExerciseById returns undefined for unknown ids', () => {
    expect(explainExerciseById('nope')).toBeUndefined();
    expect(explainExerciseById('deadlift')).toBeDefined();
  });
});

describe('recommendTodayFocus', () => {
  it('prompts onboarding when there is no history', () => {
    const focus = recommendTodayFocus([], makeProfile(), NOW);
    expect(focus.prioritize).toEqual([]);
    expect(focus.message).toMatch(/first workout/i);
  });

  it('prioritizes undertrained groups after a chest-only week', () => {
    const sessions = [
      makeSession('2026-06-26T10:00:00Z', [
        makeLog(
          'barbell-bench-press',
          Array.from({ length: 6 }, () => makeSet({ weight: 80, reps: 8 })),
        ),
      ]),
    ];
    const focus = recommendTodayFocus(sessions, makeProfile(), NOW);
    expect(focus.prioritize.length).toBeGreaterThan(0);
    // Chest was the only thing trained, so it should not be prioritized.
    expect(focus.prioritize).not.toContain('chest');
  });

  it('never recommends prioritizing a muscle that also needs rest', () => {
    const sessions = [
      makeSession('2026-06-29T18:00:00Z', [
        makeLog(
          'barbell-bench-press',
          Array.from({ length: 12 }, () => makeSet({ weight: 80, reps: 8 })),
        ),
      ]),
    ];
    const focus = recommendTodayFocus(sessions, makeProfile(), NOW);
    for (const g of focus.rest) {
      expect(focus.prioritize).not.toContain(g);
    }
  });
});
