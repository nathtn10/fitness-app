/**
 * Natural-language meal editing.
 *
 * Turns instructions like "swap the rice for cauliflower rice, double the
 * chicken, add 100g almonds" into concrete edits on an ingredient list, then
 * recalculates nutrition. Rule-based and on-device — deterministic and fully
 * unit-testable, and a clean seam to later back with an LLM for fuzzier phrasing.
 *
 * Supported commands (comma/"and"/"then" separated):
 *   swap/replace/change A for/with/to B      (B may include a quantity)
 *   double/triple/quadruple A                 |  half/halve A
 *   add [qty] B                               |  remove/drop A
 *   set A to [qty]                            (also: "change A to 200g")
 */
import { findFood } from './foods';
import { nutrientsForGrams } from './nutrients';
import type { Food, Ingredient } from './types';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `ing_${Date.now().toString(36)}_${seq.toString(36)}`;
}

export interface QuantitySpec {
  /** Explicit grams, if the quantity resolved to a mass. */
  grams?: number;
  /** Count (e.g. "2 eggs"), resolved to grams against a food's unit. */
  count?: number;
  /** The remaining food-name text after stripping the quantity. */
  name: string;
}

/** Parse a leading quantity from text: "100g almonds", "2 eggs", "almonds". */
export function parseQuantity(text: string): QuantitySpec {
  const t = text.trim();
  const match = t.match(/^(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?)?\s+(.*)$/i);
  if (!match) return { name: t };
  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();
  const name = match[3].trim();
  if (unit?.startsWith('kg') || unit === 'kilogram' || unit === 'kilograms') {
    return { grams: value * 1000, name };
  }
  if (unit?.startsWith('g')) return { grams: value, name };
  return { count: value, name };
}

/** Grams a quantity spec resolves to for a given food. */
function resolveGrams(spec: QuantitySpec, food: Food): number {
  if (spec.grams != null) return spec.grams;
  if (spec.count != null) return spec.count * (food.unitGrams ?? food.defaultServingG);
  return food.defaultServingG;
}

/** Whether text is purely a quantity with no food name (e.g. "200g"). */
function isPureQuantity(text: string): boolean {
  return /^\d+(?:\.\d+)?\s*(kg|kilograms?|g|grams?)?$/i.test(text.trim());
}

function pureQuantityGrams(text: string): number | null {
  const m = text.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?)?$/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unit = m[2]?.toLowerCase();
  return unit?.startsWith('kg') ? value * 1000 : value;
}

function makeIngredient(food: Food, grams: number): Ingredient {
  return {
    id: nextId(),
    foodId: food.id,
    name: food.name,
    grams,
    nutrients: nutrientsForGrams(food, grams),
  };
}

function withGrams(ingredient: Ingredient, grams: number): Ingredient {
  const clamped = Math.max(0, Math.round(grams));
  const food = ingredient.foodId ? findFood(ingredient.name) : undefined;
  return {
    ...ingredient,
    grams: clamped,
    nutrients: food ? nutrientsForGrams(food, clamped) : ingredient.nutrients,
  };
}

/** Find the ingredient best matching a name fragment. */
function matchIngredient(
  name: string,
  ingredients: Ingredient[],
): Ingredient | undefined {
  const q = name.trim().toLowerCase();
  let best: Ingredient | undefined;
  let bestLen = 0;
  for (const ing of ingredients) {
    const n = ing.name.toLowerCase();
    if ((n.includes(q) || q.includes(n)) && n.length > bestLen) {
      best = ing;
      bestLen = n.length;
    }
  }
  return best;
}

export interface EditResult {
  ingredients: Ingredient[];
  applied: string[];
  warnings: string[];
}

/** Split a command string into individual instructions. */
export function splitCommands(input: string): string[] {
  return input
    .split(/,|\band\b|\bthen\b|;/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

const SCALE_WORDS: Record<string, number> = {
  double: 2,
  triple: 3,
  quadruple: 4,
  half: 0.5,
  halve: 0.5,
};

function applyOne(
  command: string,
  ingredients: Ingredient[],
  applied: string[],
  warnings: string[],
): Ingredient[] {
  const cmd = command.trim().toLowerCase();
  if (!cmd) return ingredients;

  // set A to Q
  let m = cmd.match(/^set\s+(?:the\s+|my\s+)?(.+?)\s+to\s+(.+)$/);
  if (m) {
    const target = matchIngredient(m[1], ingredients);
    const grams = pureQuantityGrams(m[2]);
    if (!target) return warn(`Couldn't find "${m[1].trim()}"`, ingredients, warnings);
    if (grams == null) return warn(`Couldn't read a quantity from "${m[2].trim()}"`, ingredients, warnings);
    applied.push(`Set ${target.name} to ${grams} g`);
    return ingredients.map((i) => (i.id === target.id ? withGrams(i, grams) : i));
  }

  // swap/replace/change A for/with/to/into B
  m = cmd.match(/^(?:swap|replace|change)\s+(?:the\s+|my\s+)?(.+?)\s+(?:for|with|to|into)\s+(.+)$/);
  if (m) {
    const target = matchIngredient(m[1], ingredients);
    if (!target) return warn(`Couldn't find "${m[1].trim()}"`, ingredients, warnings);
    // "change A to 200g" with no food name = a quantity change, not a swap.
    if (isPureQuantity(m[2])) {
      const grams = pureQuantityGrams(m[2])!;
      applied.push(`Set ${target.name} to ${grams} g`);
      return ingredients.map((i) => (i.id === target.id ? withGrams(i, grams) : i));
    }
    const spec = parseQuantity(m[2]);
    const food = findFood(spec.name);
    if (!food) return warn(`Don't recognize "${spec.name}"`, ingredients, warnings);
    const grams = spec.grams != null || spec.count != null ? resolveGrams(spec, food) : target.grams;
    applied.push(`Swapped ${target.name} for ${food.name}`);
    return ingredients.map((i) => (i.id === target.id ? makeIngredient(food, grams) : i));
  }

  // double / triple / quadruple / half / halve A
  m = cmd.match(/^(double|triple|quadruple|halve|half)\s+(?:the\s+|my\s+)?(.+)$/);
  if (m) {
    const factor = SCALE_WORDS[m[1]];
    const target = matchIngredient(m[2], ingredients);
    if (!target) return warn(`Couldn't find "${m[2].trim()}"`, ingredients, warnings);
    applied.push(`${m[1][0].toUpperCase()}${m[1].slice(1)}d ${target.name}`);
    return ingredients.map((i) =>
      i.id === target.id ? withGrams(i, i.grams * factor) : i,
    );
  }

  // remove / delete / drop A
  m = cmd.match(/^(?:remove|delete|drop|no)\s+(?:the\s+|my\s+)?(.+)$/);
  if (m) {
    const target = matchIngredient(m[1], ingredients);
    if (!target) return warn(`Couldn't find "${m[1].trim()}"`, ingredients, warnings);
    applied.push(`Removed ${target.name}`);
    return ingredients.filter((i) => i.id !== target.id);
  }

  // add [qty] B
  m = cmd.match(/^add\s+(.+)$/);
  if (m) {
    const spec = parseQuantity(m[1]);
    const food = findFood(spec.name);
    if (!food) return warn(`Don't recognize "${spec.name}"`, ingredients, warnings);
    const grams = resolveGrams(spec, food);
    applied.push(`Added ${food.name}`);
    return [...ingredients, makeIngredient(food, grams)];
  }

  warnings.push(`Didn't understand "${command.trim()}"`);
  return ingredients;
}

function warn(message: string, ingredients: Ingredient[], warnings: string[]): Ingredient[] {
  warnings.push(message);
  return ingredients;
}

/**
 * Apply a natural-language edit string to an ingredient list.
 * Never throws — unrecognized instructions become warnings.
 */
export function applyNaturalLanguageEdit(
  input: string,
  ingredients: Ingredient[],
): EditResult {
  const applied: string[] = [];
  const warnings: string[] = [];
  let working = ingredients;
  for (const command of splitCommands(input)) {
    working = applyOne(command, working, applied, warnings);
  }
  return { ingredients: working, applied, warnings };
}

/** Build an ingredient from a free-text "100g chicken" style entry. */
export function ingredientFromText(text: string): Ingredient | null {
  const spec = parseQuantity(text);
  const food = findFood(spec.name);
  if (!food) return null;
  return makeIngredient(food, resolveGrams(spec, food));
}
