import { findFood, getFoodById } from '../nutrition/foods';
import {
  dailyTotals,
  DEFAULT_NUTRITION_GOALS,
  mealsOnDate,
  remainingAgainstGoals,
} from '../nutrition/goals';
import {
  applyNaturalLanguageEdit,
  ingredientFromText,
  parseQuantity,
  splitCommands,
} from '../nutrition/nlEdit';
import {
  mealNutrients,
  nutrientsForGrams,
  recalcIngredient,
  sumNutrients,
} from '../nutrition/nutrients';
import type { Ingredient, Meal } from '../nutrition/types';

function ing(text: string): Ingredient {
  const i = ingredientFromText(text);
  if (!i) throw new Error(`could not build ingredient from "${text}"`);
  return i;
}

describe('food database', () => {
  it('resolves foods by name and alias', () => {
    expect(findFood('rice')?.id).toBe('white-rice');
    expect(findFood('chicken')?.id).toBe('chicken-breast');
    expect(findFood('cauliflower rice')?.id).toBe('cauliflower-rice');
    expect(findFood('unicorn meat')).toBeUndefined();
  });

  it('prefers the more specific alias', () => {
    // "cauliflower rice" should not collapse to plain "rice".
    expect(findFood('cauliflower rice')?.id).toBe('cauliflower-rice');
  });
});

describe('nutrient math', () => {
  it('scales per-100g nutrition by mass', () => {
    const chicken = getFoodById('chicken-breast')!;
    const n = nutrientsForGrams(chicken, 200);
    expect(n.calories).toBe(330);
    expect(n.proteinG).toBeCloseTo(62, 0);
  });

  it('sums nutrients across ingredients', () => {
    const total = sumNutrients([
      nutrientsForGrams(getFoodById('white-rice')!, 100),
      nutrientsForGrams(getFoodById('chicken-breast')!, 100),
    ]);
    expect(total.calories).toBe(130 + 165);
  });
});

describe('parseQuantity', () => {
  it('parses grams', () => {
    expect(parseQuantity('100g almonds')).toMatchObject({ grams: 100, name: 'almonds' });
  });
  it('parses kilograms', () => {
    expect(parseQuantity('1kg rice')).toMatchObject({ grams: 1000, name: 'rice' });
  });
  it('parses counts', () => {
    expect(parseQuantity('2 eggs')).toMatchObject({ count: 2, name: 'eggs' });
  });
  it('handles no quantity', () => {
    expect(parseQuantity('chicken')).toMatchObject({ name: 'chicken' });
  });
});

describe('splitCommands', () => {
  it('splits on commas and "and"', () => {
    expect(
      splitCommands('swap rice for cauliflower rice, double the chicken and add almonds'),
    ).toHaveLength(3);
  });
});

describe('applyNaturalLanguageEdit', () => {
  const base = () => [ing('150g rice'), ing('120g chicken')];

  it('swaps an ingredient, keeping the original quantity', () => {
    const r = applyNaturalLanguageEdit('swap the rice for cauliflower rice', base());
    const swapped = r.ingredients.find((i) => i.foodId === 'cauliflower-rice');
    expect(swapped).toBeDefined();
    expect(swapped!.grams).toBe(150); // quantity preserved
    expect(r.ingredients.some((i) => i.foodId === 'white-rice')).toBe(false);
    expect(r.applied[0]).toMatch(/swapped/i);
  });

  it('doubles an ingredient quantity', () => {
    const r = applyNaturalLanguageEdit('double the chicken', base());
    const chicken = r.ingredients.find((i) => i.foodId === 'chicken-breast')!;
    expect(chicken.grams).toBe(240);
    // Nutrients recalculated, not stale.
    expect(chicken.nutrients.calories).toBe(nutrientsForGrams(getFoodById('chicken-breast')!, 240).calories);
  });

  it('halves, removes, and adds', () => {
    let r = applyNaturalLanguageEdit('half the rice', base());
    expect(r.ingredients.find((i) => i.foodId === 'white-rice')!.grams).toBe(75);

    r = applyNaturalLanguageEdit('remove the chicken', base());
    expect(r.ingredients.some((i) => i.foodId === 'chicken-breast')).toBe(false);

    r = applyNaturalLanguageEdit('add 100g almonds', base());
    expect(r.ingredients.find((i) => i.foodId === 'almonds')!.grams).toBe(100);
  });

  it('applies a multi-command instruction in one pass', () => {
    const r = applyNaturalLanguageEdit(
      'swap the rice for cauliflower rice, double the chicken, add 2 eggs',
      base(),
    );
    expect(r.ingredients.some((i) => i.foodId === 'cauliflower-rice')).toBe(true);
    expect(r.ingredients.find((i) => i.foodId === 'chicken-breast')!.grams).toBe(240);
    const eggs = r.ingredients.find((i) => i.foodId === 'egg')!;
    expect(eggs.grams).toBe(100); // 2 eggs * 50g
    expect(r.applied).toHaveLength(3);
  });

  it('sets a quantity via "set X to" and "change X to 200g"', () => {
    let r = applyNaturalLanguageEdit('set rice to 200g', base());
    expect(r.ingredients.find((i) => i.foodId === 'white-rice')!.grams).toBe(200);

    r = applyNaturalLanguageEdit('change chicken to 200g', base());
    expect(r.ingredients.find((i) => i.foodId === 'chicken-breast')!.grams).toBe(200);
  });

  it('warns on unknown foods and ingredients without throwing', () => {
    const r = applyNaturalLanguageEdit('swap the rice for dragon fruit surprise', base());
    expect(r.warnings.length).toBeGreaterThan(0);
    // Original list is preserved when the edit fails.
    expect(r.ingredients.some((i) => i.foodId === 'white-rice')).toBe(true);
  });
});

describe('goals & daily totals', () => {
  const meal = (loggedAt: string, ingredients: Ingredient[]): Meal => ({
    id: loggedAt,
    loggedAt,
    type: 'lunch',
    name: 'Meal',
    ingredients,
  });

  it('filters meals to a date and totals them', () => {
    const meals = [
      meal('2026-07-10T12:00:00', [ing('150g rice'), ing('120g chicken')]),
      meal('2026-07-11T12:00:00', [ing('150g rice')]),
    ];
    expect(mealsOnDate(meals, '2026-07-10')).toHaveLength(1);
    const totals = dailyTotals(meals, '2026-07-10');
    expect(totals.calories).toBe(
      mealNutrients(meals[0]).calories,
    );
  });

  it('computes remaining against goals', () => {
    const remaining = remainingAgainstGoals(DEFAULT_NUTRITION_GOALS, {
      calories: 200,
      proteinG: 20,
      carbsG: 30,
      fatG: 10,
    });
    expect(remaining.calories).toBe(DEFAULT_NUTRITION_GOALS.calories - 200);
  });

  it('recalcIngredient keeps nutrients consistent with grams', () => {
    const original = ing('100g chicken');
    const doubled = recalcIngredient({ ...original, grams: 200 });
    expect(doubled.nutrients.calories).toBe(330);
  });
});
