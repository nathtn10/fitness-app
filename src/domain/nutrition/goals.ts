/** Nutrition goals and daily aggregation helpers. */
import { toISODate } from '../dates';
import { totalNutrients } from './nutrients';
import type { Meal, Nutrients } from './types';

export interface NutritionGoals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = {
  calories: 2200,
  proteinG: 150,
  carbsG: 220,
  fatG: 70,
};

/** Meals logged on a given local calendar date (ISO yyyy-mm-dd). */
export function mealsOnDate(meals: Meal[], isoDate: string): Meal[] {
  return meals.filter((m) => toISODate(m.loggedAt) === isoDate);
}

/** Remaining nutrients against goals (never negative-clamped; can go over). */
export function remainingAgainstGoals(
  goals: NutritionGoals,
  consumed: Nutrients,
): NutritionGoals {
  return {
    calories: goals.calories - consumed.calories,
    proteinG: Math.round((goals.proteinG - consumed.proteinG) * 10) / 10,
    carbsG: Math.round((goals.carbsG - consumed.carbsG) * 10) / 10,
    fatG: Math.round((goals.fatG - consumed.fatG) * 10) / 10,
  };
}

/** Total nutrients consumed on a given date. */
export function dailyTotals(meals: Meal[], isoDate: string): Nutrients {
  return totalNutrients(mealsOnDate(meals, isoDate));
}
