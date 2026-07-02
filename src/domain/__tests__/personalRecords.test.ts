import {
  computePersonalRecords,
  detectNewPRs,
} from '../strength/personalRecords';
import { makeLog, makeSession, makeSet } from './factories';

describe('computePersonalRecords', () => {
  it('tracks heaviest weight, best 1RM and best set volume per exercise', () => {
    const sessions = [
      makeSession('2026-05-01T10:00:00Z', [
        makeLog('back-squat', [makeSet({ weight: 100, reps: 5 })]),
      ]),
      makeSession('2026-05-08T10:00:00Z', [
        makeLog('back-squat', [makeSet({ weight: 120, reps: 3 })]),
      ]),
    ];
    const prs = computePersonalRecords(sessions).get('back-squat')!;
    expect(prs.heaviestWeight).toBe(120);
    // Best single-set volume is the 100x5 set (500), not the heavier 120x3 (360).
    expect(prs.bestSetVolume).toBe(100 * 5);
    expect(prs.bestEstimatedOneRepMax).toBeGreaterThan(120);
  });

  it('ignores warmup and incomplete sets', () => {
    const sessions = [
      makeSession('2026-05-01T10:00:00Z', [
        makeLog('back-squat', [
          makeSet({ weight: 200, reps: 1, isWarmup: true }),
          makeSet({ weight: 300, reps: 1, completed: false }),
          makeSet({ weight: 100, reps: 5 }),
        ]),
      ]),
    ];
    const prs = computePersonalRecords(sessions).get('back-squat')!;
    expect(prs.heaviestWeight).toBe(100);
  });
});

describe('detectNewPRs', () => {
  const history = [
    makeSession('2026-05-01T10:00:00Z', [
      makeLog('deadlift', [makeSet({ weight: 140, reps: 5 })]),
    ]),
  ];

  it('detects an improved heaviest weight and 1RM', () => {
    const session = makeSession('2026-05-08T10:00:00Z', [
      makeLog('deadlift', [makeSet({ weight: 150, reps: 5 })]),
    ]);
    const prs = detectNewPRs(session, history);
    const kinds = prs.map((p) => p.kind).sort();
    expect(kinds).toContain('heaviestWeight');
    expect(kinds).toContain('estimatedOneRepMax');
    expect(kinds).toContain('setVolume');
    const weightPR = prs.find((p) => p.kind === 'heaviestWeight')!;
    expect(weightPR.previous).toBe(140);
    expect(weightPR.current).toBe(150);
  });

  it('reports no PRs when the session does not beat history', () => {
    const session = makeSession('2026-05-08T10:00:00Z', [
      makeLog('deadlift', [makeSet({ weight: 130, reps: 5 })]),
    ]);
    expect(detectNewPRs(session, history)).toEqual([]);
  });

  it('treats a brand-new exercise as a PR', () => {
    const session = makeSession('2026-05-08T10:00:00Z', [
      makeLog('pull-up', [makeSet({ weight: 10, reps: 8 })]),
    ]);
    const prs = detectNewPRs(session, history);
    expect(prs.length).toBeGreaterThan(0);
    expect(prs.every((p) => p.previous === 0)).toBe(true);
  });
});
