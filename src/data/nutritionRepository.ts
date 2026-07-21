/** Persistence for logged meals and nutrition goals. */
import {
  DEFAULT_NUTRITION_GOALS,
  type NutritionGoals,
} from '../domain/nutrition/goals';
import type { Meal } from '../domain/nutrition/types';
import { readJSON, writeJSON } from './storage';

const MEALS_KEY = 'fitness.meals.v1';
const GOALS_KEY = 'fitness.nutritionGoals.v1';

export async function loadMeals(): Promise<Meal[]> {
  return readJSON<Meal[]>(MEALS_KEY, []);
}
export async function saveMeals(meals: Meal[]): Promise<void> {
  await writeJSON(MEALS_KEY, meals);
}

export async function loadNutritionGoals(): Promise<NutritionGoals> {
  return readJSON<NutritionGoals>(GOALS_KEY, DEFAULT_NUTRITION_GOALS);
}
export async function saveNutritionGoals(goals: NutritionGoals): Promise<void> {
  await writeJSON(GOALS_KEY, goals);
}
