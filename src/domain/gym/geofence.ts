/**
 * Gym check-in state machine.
 *
 * Given the current location, the user's saved gyms, and the previous state,
 * this decides whether the user has arrived at or left a gym. Transitions are
 * debounced by a dwell time so momentary GPS jitter or driving past a gym
 * doesn't trigger a false check-in.
 *
 * The function is pure — it takes `now` and returns the next state plus any
 * events to record — so the whole detection flow is unit-testable without a
 * device or timers.
 */
import { gymAtLocation } from './geo';
import type { GeoCoordinate, Gym, GymCheckInState } from './types';

export interface GeofenceOptions {
  /** Time inside a gym before check-in is confirmed. Default 60s. */
  enterDwellMs?: number;
  /** Time outside a gym before check-out is confirmed. Default 120s. */
  exitDwellMs?: number;
}

export type GeofenceEvent =
  | { type: 'arrived'; gymId: string; at: string }
  | { type: 'departed'; gymId: string; at: string };

export interface GeofenceResult {
  state: GymCheckInState;
  events: GeofenceEvent[];
}

const DEFAULT_ENTER_DWELL_MS = 60_000;
const DEFAULT_EXIT_DWELL_MS = 120_000;

/**
 * Advance the check-in state given a new location reading.
 *
 * @param coord  Current location, or null if location is unavailable (state is
 *               returned unchanged in that case).
 * @param gyms   The user's saved gyms.
 * @param state  Previous check-in state.
 * @param now    Current time.
 */
export function advanceGeofence(
  coord: GeoCoordinate | null,
  gyms: Gym[],
  state: GymCheckInState,
  now: Date,
  options: GeofenceOptions = {},
): GeofenceResult {
  if (!coord) return { state, events: [] };

  const enterDwell = options.enterDwellMs ?? DEFAULT_ENTER_DWELL_MS;
  const exitDwell = options.exitDwellMs ?? DEFAULT_EXIT_DWELL_MS;

  const observedGymId = gymAtLocation(coord, gyms)?.id ?? null;

  // No change from the committed state: clear any stale pending candidate.
  if (observedGymId === state.currentGymId) {
    return {
      state: { currentGymId: state.currentGymId, since: state.since },
      events: [],
    };
  }

  // A transition candidate exists. Start or continue debouncing it.
  const pendingMatches = state.pending?.gymId === observedGymId;
  if (!pendingMatches) {
    return {
      state: {
        currentGymId: state.currentGymId,
        since: state.since,
        pending: { gymId: observedGymId, observedAt: now.toISOString() },
      },
      events: [],
    };
  }

  // Same candidate as before — check whether it has dwelled long enough.
  const observedAt = state.pending!.observedAt;
  const elapsed = now.getTime() - new Date(observedAt).getTime();
  const threshold = observedGymId === null ? exitDwell : enterDwell;
  if (elapsed < threshold) {
    return { state, events: [] }; // keep waiting
  }

  // Commit the transition. Use the moment the crossing was first observed as
  // the true arrival/departure time.
  const events: GeofenceEvent[] = [];
  if (state.currentGymId !== null) {
    events.push({ type: 'departed', gymId: state.currentGymId, at: observedAt });
  }
  if (observedGymId !== null) {
    events.push({ type: 'arrived', gymId: observedGymId, at: observedAt });
  }

  return {
    state: {
      currentGymId: observedGymId,
      since: observedGymId !== null ? observedAt : undefined,
    },
    events,
  };
}
