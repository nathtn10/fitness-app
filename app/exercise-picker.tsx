import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  EXERCISE_CATALOG,
  muscleGroupLabel,
} from '../src/domain/exercises';
import { useStore } from '../src/state/store';
import { Body, Screen } from '../src/ui/components';
import { colors, font, radius, spacing } from '../src/ui/theme';

export default function ExercisePicker() {
  const router = useRouter();
  const { addExercise, activeSession, startWorkout } = useStore();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXERCISE_CATALOG;
    return EXERCISE_CATALOG.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscles.some((m) => m.includes(q)),
    );
  }, [query]);

  const pick = (exerciseId: string) => {
    if (!activeSession) startWorkout();
    addExercise(exerciseId);
    router.back();
  };

  return (
    <Screen>
      <TextInput
        style={styles.search}
        placeholder="Search exercises or muscles…"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      <View style={{ height: spacing.md }} />
      {filtered.length === 0 ? (
        <Body muted>No matches.</Body>
      ) : (
        filtered.map((e) => (
          <Pressable
            key={e.id}
            style={styles.row}
            onPress={() => pick(e.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{e.name}</Text>
              <Text style={styles.meta}>
                {e.primaryMuscles.map(muscleGroupLabel).join(', ')} ·{' '}
                {e.equipment}
              </Text>
            </View>
            <Text style={styles.add}>＋</Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  meta: {
    color: colors.textMuted,
    fontSize: font.small,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  add: { color: colors.primary, fontSize: 24, fontWeight: '800' },
});
