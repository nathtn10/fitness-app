/** Domain types for progress photos. */

export interface ProgressPhoto {
  id: string;
  /** Local file URI in app-private storage (never the shared camera roll). */
  uri: string;
  /** ISO-8601 timestamp the photo represents. */
  takenAt: string;
  /** Optional bodyweight (kg) recorded at capture, for trend context. */
  bodyweightKg?: number;
  note?: string;
}
