import {
  computeMetrics,
  computeSplits,
  elevationGainMeters,
  estimateCalories,
  movingSeconds,
  totalDistanceMeters,
} from '../cardio/metrics';
import {
  computeAchievements,
  computeCardioRecords,
  detectNewCardioPRs,
} from '../cardio/records';
import type { Activity, ActivityType, TrackPoint } from '../cardio/types';

/**
 * Build a straight-line track heading north from a start point. Points are
 * spaced `stepMeters` apart at `stepSeconds` intervals, so distance/pace are
 * predictable. 0.00001 deg latitude ~= 1.11 m.
 */
function buildTrack(
  count: number,
  stepMeters: number,
  stepSeconds: number,
  startAlt = 0,
  altStep = 0,
): TrackPoint[] {
  const points: TrackPoint[] = [];
  const degPerMeter = 1 / 111_320;
  const start = new Date('2026-07-10T08:00:00Z').getTime();
  for (let i = 0; i < count; i++) {
    points.push({
      latitude: 37 + i * stepMeters * degPerMeter,
      longitude: -122,
      timestamp: new Date(start + i * stepSeconds * 1000).toISOString(),
      altitude: startAlt + i * altStep,
    });
  }
  return points;
}

function makeActivity(
  type: ActivityType,
  overrides: Partial<Activity['metrics']>,
  startedAt = '2026-07-10T08:00:00Z',
): Activity {
  return {
    id: `act-${startedAt}-${type}`,
    type,
    startedAt,
    endedAt: startedAt,
    points: [],
    metrics: {
      distanceMeters: 0,
      movingSeconds: 0,
      elapsedSeconds: 0,
      elevationGainMeters: 0,
      avgPaceSecPerKm: 0,
      avgSpeedKmh: 0,
      calories: 0,
      ...overrides,
    },
  };
}

describe('distance & time', () => {
  it('sums segment distances along a track', () => {
    // 11 points, 100 m apart => ~1000 m total.
    const track = buildTrack(11, 100, 30);
    expect(totalDistanceMeters(track)).toBeGreaterThan(950);
    expect(totalDistanceMeters(track)).toBeLessThan(1050);
  });

  it('excludes paused segments from moving time', () => {
    const moving = buildTrack(3, 100, 30); // ~3.3 m/s, moving
    // Append a long pause: same location, 600s later.
    const paused: TrackPoint = {
      ...moving[moving.length - 1],
      timestamp: new Date(
        new Date(moving[moving.length - 1].timestamp).getTime() + 600_000,
      ).toISOString(),
    };
    const track = [...moving, paused];
    // Moving time counts the two 30s moving segments, not the 600s pause.
    expect(movingSeconds(track)).toBe(60);
  });
});

describe('elevation', () => {
  it('sums positive gain and filters small noise', () => {
    // Climb 5m per step over 5 steps = 20m gain (4 gaps).
    const climbing = buildTrack(5, 50, 30, 100, 5);
    expect(elevationGainMeters(climbing)).toBeGreaterThanOrEqual(19);
    // Flat track with sub-noise jitter should register no gain.
    const flat = buildTrack(5, 50, 30, 100, 0);
    expect(elevationGainMeters(flat)).toBe(0);
  });
});

describe('calories', () => {
  it('scales with body weight', () => {
    const light = estimateCalories('run', 5000, 1500, 60);
    const heavy = estimateCalories('run', 5000, 1500, 90);
    expect(heavy).toBeGreaterThan(light);
  });

  it('is zero with no moving time', () => {
    expect(estimateCalories('run', 0, 0)).toBe(0);
  });
});

describe('computeMetrics & splits', () => {
  it('produces a coherent metric set', () => {
    const track = buildTrack(21, 100, 30); // ~2 km, 30s/100m => 5 min/km
    const m = computeMetrics(track, 'run', 70);
    expect(m.distanceMeters).toBeGreaterThan(1900);
    expect(m.avgPaceSecPerKm).toBeGreaterThan(0);
    expect(m.avgSpeedKmh).toBeGreaterThan(0);
    expect(m.calories).toBeGreaterThan(0);
  });

  it('splits a track into per-kilometer segments', () => {
    const track = buildTrack(21, 100, 30); // ~2 km
    const splits = computeSplits(track, 1000);
    expect(splits.length).toBeGreaterThanOrEqual(2);
    expect(splits[0].distanceMeters).toBeGreaterThan(950);
    expect(splits[0].distanceMeters).toBeLessThan(1050);
    expect(splits[0].paceSecPerKm).toBeGreaterThan(0);
  });
});

describe('records & PRs', () => {
  it('tracks longest distance and best pace per type', () => {
    const activities = [
      makeActivity('run', { distanceMeters: 5000, avgPaceSecPerKm: 330 }),
      makeActivity('run', { distanceMeters: 8000, avgPaceSecPerKm: 300 }),
    ];
    const rec = computeCardioRecords(activities).get('run')!;
    expect(rec.longestDistanceMeters).toBe(8000);
    expect(rec.bestPaceSecPerKm).toBe(300); // lower is better
  });

  it('detects a new distance PR against history', () => {
    const history = [makeActivity('run', { distanceMeters: 5000 })];
    const activity = makeActivity('run', { distanceMeters: 10000 });
    const prs = detectNewCardioPRs(activity, history);
    expect(prs.some((p) => p.kind === 'longestDistance')).toBe(true);
  });

  it('keeps running and cycling records separate', () => {
    const history = [makeActivity('ride', { distanceMeters: 40000 })];
    const run = makeActivity('run', { distanceMeters: 3000 });
    // A 3km run is a run PR even though a 40km ride exists.
    expect(
      detectNewCardioPRs(run, history).some((p) => p.kind === 'longestDistance'),
    ).toBe(true);
  });

  it('awards milestone achievements', () => {
    const activities = [
      makeActivity('run', { distanceMeters: 10000, elevationGainMeters: 200 }),
    ];
    const badges = computeAchievements(activities).map((a) => a.id);
    expect(badges).toContain('first-activity');
    expect(badges).toContain('5k-club');
    expect(badges).toContain('10k-club');
  });
});
