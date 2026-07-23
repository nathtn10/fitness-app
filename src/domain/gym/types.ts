/** Domain types for gym location detection and busyness. */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

/** A gym the user has saved, with a circular geofence. */
export interface Gym {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Geofence radius in meters. */
  radiusMeters: number;
}

/** A recorded visit to a gym. `departedAt` is unset while still checked in. */
export interface GymVisit {
  id: string;
  gymId: string;
  /** ISO-8601 timestamp of arrival. */
  arrivedAt: string;
  /** ISO-8601 timestamp of departure, if the visit has ended. */
  departedAt?: string;
}

/** The user's current check-in state, persisted so detection survives restarts. */
export interface GymCheckInState {
  /** Gym the user is currently inside, or null if not at any gym. */
  currentGymId: string | null;
  /** When the current in-progress visit started (ISO), if checked in. */
  since?: string;
  /**
   * Candidate transition being debounced: the app saw the user enter/leave but
   * is waiting for the dwell time to confirm before committing the change.
   */
  pending?: {
    gymId: string | null;
    /** ISO timestamp when the candidate was first observed. */
    observedAt: string;
  };
}
