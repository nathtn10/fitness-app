/**
 * Nutrition dashboard: today's calories and macros vs. goals, the day's meals,
 * and an entry point to log a new meal. Reached from Home and More.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { toISODate } from '../src/domain/dates';
import { dailyTotals, remainingAgainstGoals } from '../src/domain/nutrition/goals';
import { mealNutrients } from '../src/domain/nutrition/nutrients';
import { mealsOnDate } from '../src/domain/nutrition/goals';
import { useNutrition } from '../src/state/nutritionStore';
import { Body, Button, Card, H1, H2, Loading, Screen } from '../src/ui/components';
import { colors, font, radius, spacing } from '../src/ui/theme';

const MEAL_LABEL: Record<string, string> = {
  breakfast: '🍳 Breakfast',
  lunch: '🥗 Lunch',
  dinner: '🍽️ Dinner',
  snack: '🍎 Snack',
};

export default function NutritionScreen() {
  const router = useRouter();
  const { loading, meals, goals } = useNutrition();

  const today = toISODate(new Date());
  const totals = useMemo(() => dailyTotals(meals, today), [meals, today]);
  const remaining = remainingAgainstGoals(goals, totals);
  const todaysMeals = useMemo(() => mealsOnDate(meals, today), [meals, today]);

  if (loading) return <Loading />;

  return (
    <Screen>
      <H1>Nutrition</H1>

      <Card>
        <H2>Today</H2>
        <View style={styles.calorieRow}>
          <Text style={styles.calorieValue}>{totals.calories}</Text>
          <Text style={styles.calorieGoal}> / {goals.calories} kcal</Text>
        </View>
        <Text
          style={[
            styles.remaining,
            { color: remaining.calories >= 0 ? colors.success : colors.danger },
          ]}
        >
          {remaining.calories >= 0
            ? `${remaining.calories} kcal remaining`
            : `${Math.abs(remaining.calories)} kcal over`}
        </Text>

        <View style={{ height: spacing.md }} />
        <MacroBar label="Protein" value={totals.proteinG} goal={goals.proteinG} color={colors.primary} />
        <MacroBar label="Carbs" value={totals.carbsG} goal={goals.carbsG} color={colors.warning} />
        <MacroBar label="Fat" value={totals.fatG} goal={goals.fatG} color={colors.accent} />
      </Card>

      <Button title="＋ Log a meal" onPress={() => router.push('/meal-editor')} />
      <View style={{ height: spacing.lg }} />

      <H2>Today&apos;s meals</H2>
      {todaysMeals.length === 0 ? (
        <Body muted>No meals logged today yet.</Body>
      ) : (
        todaysMeals.map((m) => {
          const n = mealNutrients(m);
          return (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/meal-editor?id=${m.id}`)}
            >
              <Card>
                <View style={styles.mealHeader}>
                  <Body>{m.name || MEAL_LABEL[m.type]}</Body>
                  <Text style={styles.mealCals}>{n.calories} kcal</Text>
                </View>
                <Body muted>
                  {MEAL_LABEL[m.type]} · {m.ingredients.length} ingredient
                  {m.ingredients.length === 1 ? '' : 's'} · P{n.proteinG} C
                  {n.carbsG} F{n.fatG}
                </Body>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>
        {Math.round(value)}/{goal}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  calorieRow: { flexDirection: 'row', alignItems: 'baseline' },
  calorieValue: { color: colors.text, fontSize: 40, fontWeight: '800' },
  calorieGoal: { color: colors.textMuted, fontSize: font.body },
  remaining: { fontSize: font.small, fontWeight: '600', marginTop: 2 },
  macroRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xs },
  macroLabel: { color: colors.text, fontSize: font.small, width: 60 },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  macroValue: { color: colors.textMuted, fontSize: font.tiny, width: 64, textAlign: 'right' },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  mealCals: { color: colors.text, fontWeight: '700', fontSize: font.body },
});
