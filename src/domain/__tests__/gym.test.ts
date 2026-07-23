import { busynessHeatmap, estimateBusyness } from '../gym/busyness';
import { gymAtLocation, haversineMeters, isWithinGym } from '../gym/geo';
import { advanceGeofence } from '../gym/geofence';
import type { Gym, GymCheckInState, GymVisit } from '../gym/types';

const GYM: Gym = {
  id: 'gym-1',
  name: 'Iron Temple',
  latitude: 37.7749,
  longitude: -122.4194,
  radiusMeters: 100,
};

describe('geo math', () => {
  it('computes ~0 distance for the same point', () => {
    expect(haversineMeters(GYM, GYM)).toBeLessThan(1);
  });

  it('computes a known distance roughly correctly', () => {
    // ~1.11 km per 0.01 degree of latitude near the equator/mid-latitudes.
    const d = haversineMeters(
      { latitude: 37.7749, longitude: -122.4194 },
      { latitude: 37.7849, longitude: -122.4194 },
    );
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1200);
  });

  it('detects points inside and outside the geofence', () => {
    expect(isWithinGym({ latitude: 37.7749, longitude: -122.4194 }, GYM)).toBe(
      true,
    );
    expect(isWithinGym({ latitude: 37.9, longitude: -122.4194 }, GYM)).toBe(
      false,
    );
  });

  it('gymAtLocation returns the containing gym or null', () => {
    expect(gymAtLocation({ latitude: 37.7749, longitude: -122.4194 }, [GYM])).toBe(
      GYM,
    );
    expect(gymAtLocation({ latitude: 0, longitude: 0 }, [GYM])).toBeNull();
  });
});

describe('geofence state machine', () => {
  const outside = { latitude: 0, longitude: 0 };
  const inside = { latitude: 37.7749, longitude: -122.4194 };
  const clear: GymCheckInState = { currentGymId: null };

  it('does not check in immediately (debounces entry)', () => {
    const t0 = new Date('2026-07-01T10:00:00Z');
    const r = advanceGeofence(inside, [GYM], clear, t0);
    expect(r.events).toEqual([]);
    expect(r.state.currentGymId).toBeNull();
    expect(r.state.pending?.gymId).toBe('gym-1');
  });

  it('checks in after the entry dwell time elapses', () => {
    const t0 = new Date('2026-07-01T10:00:00Z');
    const afterCandidate = advanceGeofence(inside, [GYM], clear, t0);
    const t1 = new Date('2026-07-01T10:01:30Z'); // 90s later > 60s dwell
    const r = advanceGeofence(inside, [GYM], afterCandidate.state, t1);
    expect(r.state.currentGymId).toBe('gym-1');
    expect(r.events).toEqual([
      { type: 'arrived', gymId: 'gym-1', at: t0.toISOString() },
    ]);
  });

  it('checks out only after the exit dwell time', () => {
    const checkedIn: GymCheckInState = {
      currentGymId: 'gym-1',
      since: '2026-07-01T10:00:00Z',
    };
    const t0 = new Date('2026-07-01T11:00:00Z');
    const candidate = advanceGeofence(outside, [GYM], checkedIn, t0);
    expect(candidate.state.currentGymId).toBe('gym-1'); // still in, debouncing
    const t1 = new Date('2026-07-01T11:03:00Z'); // 180s > 120s exit dwell
    const r = advanceGeofence(outside, [GYM], candidate.state, t1);
    expect(r.state.currentGymId).toBeNull();
    expect(r.events).toEqual([
      { type: 'departed', gymId: 'gym-1', at: t0.toISOString() },
    ]);
  });

  it('ignores transient blips that revert before the dwell time', () => {
    const t0 = new Date('2026-07-01T10:00:00Z');
    const candidate = advanceGeofence(inside, [GYM], clear, t0);
    // Location snaps back outside before dwell completes.
    const t1 = new Date('2026-07-01T10:00:20Z');
    const r = advanceGeofence(outside, [GYM], candidate.state, t1);
    expect(r.state.currentGymId).toBeNull();
    expect(r.events).toEqual([]);
  });

  it('returns state unchanged when location is unavailable', () => {
    const r = advanceGeofence(null, [GYM], clear, new Date());
    expect(r.state).toBe(clear);
    expect(r.events).toEqual([]);
  });
});

describe('busyness', () => {
  function visitAt(iso: string, durationH = 1): GymVisit {
    const start = new Date(iso);
    const end = new Date(start.getTime() + durationH * 3600_000);
    return {
      id: iso,
      gymId: 'gym-1',
      arrivedAt: start.toISOString(),
      departedAt: end.toISOString(),
    };
  }

  it('returns unknown with no data', () => {
    const est = estimateBusyness([], new Date('2026-07-01T18:00:00'));
    expect(est.level).toBe('unknown');
  });

  it('builds a heatmap crediting each overlapped hour', () => {
    // A 2-hour visit should credit two adjacent hour slots.
    const heatmap = busynessHeatmap([visitAt('2026-07-01T18:00:00', 2)]);
    const total = heatmap.flat().reduce((a, b) => a + b, 0);
    expect(total).toBe(2);
  });

  it('rates a frequently-visited slot as busier than a rare one', () => {
    // Many Monday-6pm visits, one Monday-6am visit.
    const visits: GymVisit[] = [];
    for (let w = 0; w < 5; w++) {
      visits.push(visitAt(`2026-06-0${w + 1}T18:00:00`));
    }
    const heatmap = busynessHeatmap(visits);
    const totalPeak = heatmap.flat().reduce((a, b) => a + b, 0);
    expect(totalPeak).toBeGreaterThan(0);
  });
});
