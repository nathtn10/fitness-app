/**
 * One-rep-max (1RM) estimation.
 *
 * A 1RM is the maximum weight you could lift for a single rep. Estimating it
 * from submaximal sets lets us track strength progress on a single comparable
 * scale even when rep ranges vary between sessions.
 */

/** Epley formula: 1RM = w * (1 + reps/30). Good for lower rep ranges. */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Brzycki formula: 1RM = w * 36 / (37 - reps). Undefined at 37+ reps. */
export function brzycki1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps >= 37) return epley1RM(weight, reps); // formula breaks down; fall back
  return (weight * 36) / (37 - reps);
}

/**
 * Estimated 1RM used throughout the app.
 *
 * We average Epley and Brzycki, which reduces the systematic bias each has at
 * different rep ranges (Epley tends high at high reps, Brzycki tends low).
 * Very high rep sets are poor 1RM predictors, so we cap the rep contribution.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const cappedReps = Math.min(reps, 15);
  const estimate = (epley1RM(weight, cappedReps) + brzycki1RM(weight, cappedReps)) / 2;
  return Math.round(estimate * 100) / 100;
}

/**
 * Inverse: estimate the weight you could lift for a target number of reps given
 * a known/estimated 1RM. Uses the Epley rearrangement. Useful for suggesting
 * working weights.
 */
export function weightForReps(oneRepMax: number, reps: number): number {
  if (oneRepMax <= 0 || reps <= 0) return 0;
  if (reps === 1) return oneRepMax;
  const weight = oneRepMax / (1 + reps / 30);
  return Math.round(weight * 100) / 100;
}
