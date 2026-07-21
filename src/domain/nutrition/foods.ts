/**
 * Built-in food reference database (per-100g nutrition).
 *
 * Values are rounded approximations from public nutrition data, adequate for
 * tracking. This is the seam where a barcode/API-backed database can slot in
 * later — resolvers below are the only lookup surface the rest of the app uses.
 */
import type { Food } from './types';

export const FOOD_DATABASE: Food[] = [
  {
    id: 'chicken-breast',
    name: 'Chicken breast',
    aliases: ['chicken', 'chicken breast', 'grilled chicken'],
    per100g: { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
    defaultServingG: 120,
  },
  {
    id: 'white-rice',
    name: 'White rice (cooked)',
    aliases: ['rice', 'white rice', 'steamed rice'],
    per100g: { calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3 },
    defaultServingG: 150,
  },
  {
    id: 'brown-rice',
    name: 'Brown rice (cooked)',
    aliases: ['brown rice'],
    per100g: { calories: 123, proteinG: 2.7, carbsG: 26, fatG: 1 },
    defaultServingG: 150,
  },
  {
    id: 'cauliflower-rice',
    name: 'Cauliflower rice',
    aliases: ['cauliflower rice', 'cauli rice', 'cauliflower'],
    per100g: { calories: 25, proteinG: 1.9, carbsG: 5, fatG: 0.3 },
    defaultServingG: 150,
  },
  {
    id: 'egg',
    name: 'Egg',
    aliases: ['egg', 'eggs', 'whole egg'],
    per100g: { calories: 143, proteinG: 13, carbsG: 1.1, fatG: 9.5 },
    unitGrams: 50,
    defaultServingG: 50,
  },
  {
    id: 'olive-oil',
    name: 'Olive oil',
    aliases: ['olive oil', 'oil'],
    per100g: { calories: 884, proteinG: 0, carbsG: 0, fatG: 100 },
    defaultServingG: 14,
  },
  {
    id: 'almonds',
    name: 'Almonds',
    aliases: ['almonds', 'almond'],
    per100g: { calories: 579, proteinG: 21, carbsG: 22, fatG: 50 },
    defaultServingG: 28,
  },
  {
    id: 'banana',
    name: 'Banana',
    aliases: ['banana', 'bananas'],
    per100g: { calories: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3 },
    unitGrams: 118,
    defaultServingG: 118,
  },
  {
    id: 'oats',
    name: 'Oats',
    aliases: ['oats', 'oatmeal', 'porridge'],
    per100g: { calories: 389, proteinG: 17, carbsG: 66, fatG: 7 },
    defaultServingG: 40,
  },
  {
    id: 'greek-yogurt',
    name: 'Greek yogurt',
    aliases: ['greek yogurt', 'yogurt', 'yoghurt'],
    per100g: { calories: 59, proteinG: 10, carbsG: 3.6, fatG: 0.4 },
    defaultServingG: 170,
  },
  {
    id: 'broccoli',
    name: 'Broccoli',
    aliases: ['broccoli'],
    per100g: { calories: 34, proteinG: 2.8, carbsG: 7, fatG: 0.4 },
    defaultServingG: 100,
  },
  {
    id: 'salmon',
    name: 'Salmon',
    aliases: ['salmon'],
    per100g: { calories: 208, proteinG: 20, carbsG: 0, fatG: 13 },
    defaultServingG: 120,
  },
  {
    id: 'sweet-potato',
    name: 'Sweet potato',
    aliases: ['sweet potato', 'sweet potatoes', 'yam'],
    per100g: { calories: 86, proteinG: 1.6, carbsG: 20, fatG: 0.1 },
    defaultServingG: 130,
  },
  {
    id: 'peanut-butter',
    name: 'Peanut butter',
    aliases: ['peanut butter', 'pb'],
    per100g: { calories: 588, proteinG: 25, carbsG: 20, fatG: 50 },
    defaultServingG: 32,
  },
];

const NORMALIZED: { food: Food; needle: string }[] = FOOD_DATABASE.flatMap(
  (food) => [
    { food, needle: food.name.toLowerCase() },
    ...food.aliases.map((a) => ({ food, needle: a.toLowerCase() })),
  ],
);

/** Resolve a food by (case-insensitive) name or alias. Longest match wins. */
export function findFood(query: string): Food | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  // Exact name/alias match first.
  const exact = NORMALIZED.find((n) => n.needle === q);
  if (exact) return exact.food;

  // Otherwise, the longest alias contained in the query (or vice versa).
  let best: Food | undefined;
  let bestLen = 0;
  for (const { food, needle } of NORMALIZED) {
    if ((q.includes(needle) || needle.includes(q)) && needle.length > bestLen) {
      best = food;
      bestLen = needle.length;
    }
  }
  return best;
}

export function getFoodById(id: string): Food | undefined {
  return FOOD_DATABASE.find((f) => f.id === id);
}
