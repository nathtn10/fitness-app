/** Domain types for nutrition logging and natural-language meal editing. */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Macro/energy content. All values are absolute (not per-100g) unless noted. */
export interface Nutrients {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** A food in the reference database, with per-100g nutrition. */
export interface Food {
  id: string;
  name: string;
  /** Alternate names used for text matching (e.g. "rice" -> white rice). */
  aliases: string[];
  per100g: Nutrients;
  /** Grams per countable unit (e.g. 1 egg ~= 50g). Absent for bulk foods. */
  unitGrams?: number;
  /** Default serving in grams when a quantity isn't specified. */
  defaultServingG: number;
}

/** An ingredient within a logged meal, resolved to a known food when possible. */
export interface Ingredient {
  id: string;
  /** Reference food id, or null if free-text/unresolved. */
  foodId: string | null;
  name: string;
  grams: number;
  /** Cached nutrients for `grams` of this food (0s if unresolved). */
  nutrients: Nutrients;
}

export interface Meal {
  id: string;
  /** ISO-8601 timestamp of when the meal was logged. */
  loggedAt: string;
  type: MealType;
  name: string;
  ingredients: Ingredient[];
}
