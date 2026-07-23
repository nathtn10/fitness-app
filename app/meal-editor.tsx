/**
 * Meal editor: build a meal from ingredients and edit it in natural language.
 *
 * The NL box is the headline feature — "swap the rice for cauliflower rice,
 * double the chicken, add 2 eggs" is parsed on-device and applied instantly,
 * with everything recalculated. Also supports direct add and per-ingredient
 * gram edits.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  applyNaturalLanguageEdit,
  ingredientFromText,
} from '../src/domain/nutrition/nlEdit';
import { recalcIngredient, sumNutrients } from '../src/domain/nutrition/nutrients';
import type { Ingredient, Meal, MealType } from '../src/domain/nutrition/types';
import { createId } from '../src/lib/id';
import { LIMITS, sanitizeText } from '../src/lib/sanitize';
import { useNutrition } from '../src/state/nutritionStore';
import { Body, Button, Card, H1, H2, Screen } from '../src/ui/components';
import { colors, font, radius, spacing } from '../src/ui/theme';

const TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { meals, saveMeal, deleteMeal } = useNutrition();
  const existing = id ? meals.find((m) => m.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<MealType>(existing?.type ?? 'lunch');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    existing?.ingredients ?? [],
  );
  const [addText, setAddText] = useState('');
  const [nlText, setNlText] = useState('');
  const [feedback, setFeedback] = useState<{
    applied: string[];
    warnings: string[];
  } | null>(null);

  const totals = useMemo(
    () => sumNutrients(ingredients.map((i) => i.nutrients)),
    [ingredients],
  );

  const handleAdd = () => {
    const ing = ingredientFromText(addText);
    if (!ing) {
      setFeedback({ applied: [], warnings: [`Don't recognize "${addText.trim()}"`] });
      return;
    }
    setIngredients((prev) => [...prev, ing]);
    setAddText('');
    setFeedback(null);
  };

  const handleNlEdit = () => {
    if (!nlText.trim()) return;
    const result = applyNaturalLanguageEdit(nlText, ingredients);
    setIngredients(result.ingredients);
    setFeedback({ applied: result.applied, warnings: result.warnings });
    if (result.applied.length > 0) setNlText('');
  };

  const setGrams = (ingredientId: string, gramsText: string) => {
    const grams = Math.max(0, parseInt(gramsText, 10) || 0);
    setIngredients((prev) =>
      prev.map((i) =>
        i.id === ingredientId ? recalcIngredient({ ...i, grams }) : i,
      ),
    );
  };

  const removeIngredient = (ingredientId: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== ingredientId));
  };

  const handleSave = () => {
    const meal: Meal = {
      id: existing?.id ?? createId('meal'),
      loggedAt: existing?.loggedAt ?? new Date().toISOString(),
      type,
      name: sanitizeText(name, LIMITS.workoutName),
      ingredients,
    };
    saveMeal(meal);
    router.back();
  };

  return (
    <Screen>
      <H1>{existing ? 'Edit meal' : 'New meal'}</H1>

      <Card>
        <TextInput
          style={styles.input}
          placeholder="Meal name (optional)"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={LIMITS.workoutName}
        />
        <View style={{ height: spacing.sm }} />
        <View style={styles.typeRow}>
          {TYPES.map((t) => (
            <Pressable
              key={t}
              style={[styles.typeChip, type === t && styles.typeActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeText, type === t && { color: '#fff' }]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Natural-language edit box */}
      <Card>
        <H2>✨ Edit in plain English</H2>
        <Body muted>
          e.g. &quot;swap the rice for cauliflower rice, double the chicken, add
          2 eggs&quot;
        </Body>
        <View style={{ height: spacing.sm }} />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Tell me what to change…"
          placeholderTextColor={colors.textMuted}
          value={nlText}
          onChangeText={setNlText}
          multiline
        />
        <View style={{ height: spacing.sm }} />
        <Button title="Apply changes" onPress={handleNlEdit} />
        {feedback ? (
          <View style={{ marginTop: spacing.sm }}>
            {feedback.applied.map((a, i) => (
              <Text key={`a${i}`} style={styles.applied}>
                ✓ {a}
              </Text>
            ))}
            {feedback.warnings.map((w, i) => (
              <Text key={`w${i}`} style={styles.warning}>
                ⚠ {w}
              </Text>
            ))}
          </View>
        ) : null}
      </Card>

      {/* Ingredients */}
      <H2>Ingredients</H2>
      {ingredients.length === 0 ? (
        <Body muted>No ingredients yet. Add some below.</Body>
      ) : (
        ingredients.map((ing) => (
          <Card key={ing.id}>
            <View style={styles.ingHeader}>
              <Body>{ing.name}</Body>
              <Pressable onPress={() => removeIngredient(ing.id)}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.ingBody}>
              <TextInput
                style={styles.gramsInput}
                keyboardType="numeric"
                value={String(ing.grams)}
                onChangeText={(t) => setGrams(ing.id, t)}
                maxLength={5}
              />
              <Text style={styles.gramsUnit}>g</Text>
              <Text style={styles.ingCals}>
                {ing.nutrients.calories} kcal · P{ing.nutrients.proteinG} C
                {ing.nutrients.carbsG} F{ing.nutrients.fatG}
              </Text>
            </View>
          </Card>
        ))
      )}

      <Card>
        <TextInput
          style={styles.input}
          placeholder="Add ingredient (e.g. 150g rice, 2 eggs)"
          placeholderTextColor={colors.textMuted}
          value={addText}
          onChangeText={setAddText}
          onSubmitEditing={handleAdd}
        />
        <View style={{ height: spacing.sm }} />
        <Button title="＋ Add ingredient" variant="ghost" onPress={handleAdd} />
      </Card>

      {/* Totals + save */}
      <Card>
        <H2>Total</H2>
        <Text style={styles.total}>{totals.calories} kcal</Text>
        <Body muted>
          Protein {totals.proteinG}g · Carbs {totals.carbsG}g · Fat{' '}
          {totals.fatG}g
        </Body>
      </Card>

      <Button
        title={existing ? 'Save changes' : 'Log meal'}
        variant="success"
        onPress={handleSave}
        disabled={ingredients.length === 0}
      />
      {existing ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button
            title="Delete meal"
            variant="danger"
            onPress={() => {
              deleteMeal(existing.id);
              router.back();
            }}
          />
        </>
      ) : null}
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.body,
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { color: colors.text, fontSize: font.small, textTransform: 'capitalize' },
  applied: { color: colors.success, fontSize: font.small, marginTop: 2 },
  warning: { color: colors.warning, fontSize: font.small, marginTop: 2 },
  ingHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  ingBody: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  gramsInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    color: colors.text,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    width: 64,
    textAlign: 'center',
    fontSize: font.body,
  },
  gramsUnit: { color: colors.textMuted, marginLeft: spacing.xs, marginRight: spacing.md },
  ingCals: { color: colors.textMuted, fontSize: font.tiny, flex: 1 },
  remove: { color: colors.danger, fontSize: font.body, fontWeight: '700' },
  total: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
});
