/** Nutrient scaling and aggregation. Pure and unit-testable. */
import { getFoodById } from './foods';
import type { Food, Ingredient, Meal, Nutrients } from './types';

export const ZERO_NUTRIENTS: Nutrients = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Nutrients for a given mass (grams) of a food. */
export function nutrientsForGrams(food: Food, grams: number): Nutrients {
  const factor = grams / 100;
  return {
    calories: Math.round(food.per100g.calories * factor),
    proteinG: round1(food.per100g.proteinG * factor),
    carbsG: round1(food.per100g.carbsG * factor),
    fatG: round1(food.per100g.fatG * factor),
  };
}

/** Sum a list of nutrient objects. */
export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      proteinG: round1(acc.proteinG + n.proteinG),
      carbsG: round1(acc.carbsG + n.carbsG),
      fatG: round1(acc.fatG + n.fatG),
    }),
    { ...ZERO_NUTRIENTS },
  );
}

/** Total nutrients for a meal. */
export function mealNutrients(meal: Meal): Nutrients {
  return sumNutrients(meal.ingredients.map((i) => i.nutrients));
}

/** Total nutrients across many meals (e.g. a day). */
export function totalNutrients(meals: Meal[]): Nutrients {
  return sumNutrients(meals.map(mealNutrients));
}

/**
 * Recompute an ingredient's cached nutrients from its food + grams. Call after
 * any quantity or food change so the cache never drifts from the source data.
 */
export function recalcIngredient(ingredient: Ingredient): Ingredient {
  const food = ingredient.foodId ? getFoodById(ingredient.foodId) : undefined;
  return {
    ...ingredient,
    nutrients: food
      ? nutrientsForGrams(food, ingredient.grams)
      : { ...ZERO_NUTRIENTS },
  };
}
