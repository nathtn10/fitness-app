import {
  brzycki1RM,
  epley1RM,
  estimateOneRepMax,
  weightForReps,
} from '../strength/oneRepMax';

describe('one-rep-max estimation', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(epley1RM(100, 1)).toBe(100);
    expect(brzycki1RM(100, 1)).toBe(100);
  });

  it('estimates a higher 1RM than the lifted weight for multi-rep sets', () => {
    const est = estimateOneRepMax(100, 5);
    expect(est).toBeGreaterThan(100);
    // 5 reps at 100 is ~112-116kg estimated 1RM across common formulas.
    expect(est).toBeGreaterThan(110);
    expect(est).toBeLessThan(120);
  });

  it('is monotonic: more reps at the same weight implies a higher 1RM', () => {
    expect(estimateOneRepMax(100, 8)).toBeGreaterThan(estimateOneRepMax(100, 5));
  });

  it('guards against invalid inputs', () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
    expect(estimateOneRepMax(-50, 5)).toBe(0);
  });

  it('does not blow up at the Brzycki singularity (37 reps)', () => {
    expect(Number.isFinite(estimateOneRepMax(50, 40))).toBe(true);
    expect(estimateOneRepMax(50, 40)).toBeGreaterThan(0);
  });

  it('weightForReps is an approximate inverse of the 1RM estimate', () => {
    const oneRm = 120;
    const w5 = weightForReps(oneRm, 5);
    // Lifting w5 for 5 reps should estimate back near the original 1RM.
    expect(estimateOneRepMax(w5, 5)).toBeGreaterThan(oneRm * 0.95);
    expect(estimateOneRepMax(w5, 5)).toBeLessThan(oneRm * 1.05);
  });
});
