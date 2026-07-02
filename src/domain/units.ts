/** Weight-unit conversion helpers. */
import type { WeightUnit } from './types';

const KG_PER_LB = 0.45359237;

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

/** Convert a weight from one unit to another. */
export function convertWeight(
  weight: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) return weight;
  return from === 'kg' ? kgToLb(weight) : lbToKg(weight);
}

/** Round to the nearest loadable increment (2.5 for kg, 5 for lb by default). */
export function roundToIncrement(
  weight: number,
  unit: WeightUnit,
  increment = unit === 'kg' ? 2.5 : 5,
): number {
  if (increment <= 0) return weight;
  return Math.round(weight / increment) * increment;
}
