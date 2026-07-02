import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getExercise } from '../../src/domain/exercises';
import type { SetEntry } from '../../src/domain/types';
import { useStore } from '../../src/state/store';
import {
  Body,
  Button,
  Card,
  H1,
  H2,
  Loading,
  Screen,
} from '../../src/ui/components';
import { colors, font, radius, spacing } from '../../src/ui/theme';
import { RestTimer } from '../../src/ui/RestTimer';

export default function WorkoutScreen() {
  const router = useRouter();
  const {
    loading,
    activeSession,
    startWorkout,
    finishWorkout,
    cancelWorkout,
    addSet,
    updateSet,
    removeSet,
    removeExercise,
  } = useStore();

  if (loading) return <Loading />;

  if (!activeSession) {
    return (
      <Screen>
        <H1>Workout</H1>
        <Body muted>No active session. Start one to begin logging sets.</Body>
        <View style={{ height: spacing.lg }} />
        <Button title="Start workout" onPress={() => startWorkout()} />
      </Screen>
    );
  }

  const unit = activeSession.unit;

  const handleFinish = () => {
    const prs = finishWorkout();
    if (prs.length > 0) {
      const lines = prs.map((p) => {
        const name = getExercise(p.exerciseId)?.name ?? p.exerciseId;
        const kind =
          p.kind === 'heaviestWeight'
            ? 'heaviest weight'
            : p.kind === 'estimatedOneRepMax'
              ? 'estimated 1RM'
              : 'set volume';
        return `• ${name}: new ${kind} (${Math.round(p.current)})`;
      });
      Alert.alert('🎉 New personal records!', lines.join('\n'));
    }
    router.push('/progress');
  };

  const handleCancel = () => {
    Alert.alert('Discard workout?', 'This session will not be saved.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: cancelWorkout },
    ]);
  };

  return (
    <Screen>
      <H1>{activeSession.name}</H1>
      <Body muted>
        Started {new Date(activeSession.startedAt).toLocaleTimeString()}
      </Body>

      <View style={{ height: spacing.md }} />
      <RestTimer />
      <View style={{ height: spacing.md }} />

      {activeSession.exercises.length === 0 ? (
        <Body muted>No exercises yet. Add one to start logging sets.</Body>
      ) : (
        activeSession.exercises.map((log) => {
          const exercise = getExercise(log.exerciseId);
          return (
            <Card key={log.id}>
              <View style={styles.exerciseHeader}>
                <H2>{exercise?.name ?? log.exerciseId}</H2>
                <Pressable onPress={() => removeExercise(log.id)}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>

              <View style={styles.setHeaderRow}>
                <Text style={[styles.setCol, styles.colIdx]}>#</Text>
                <Text style={[styles.setCol, styles.colInput]}>
                  Weight ({unit})
                </Text>
                <Text style={[styles.setCol, styles.colInput]}>Reps</Text>
                <Text style={[styles.setCol, styles.colDone]}>✓</Text>
                <Text style={[styles.setCol, styles.colDel]} />
              </View>

              {log.sets.map((set, idx) => (
                <SetRow
                  key={set.id}
                  index={idx + 1}
                  set={set}
                  onChange={(patch) => updateSet(log.id, set.id, patch)}
                  onDelete={() => removeSet(log.id, set.id)}
                />
              ))}

              <View style={{ height: spacing.sm }} />
              <Button
                title="+ Add set"
                variant="ghost"
                onPress={() => addSet(log.id)}
              />
            </Card>
          );
        })
      )}

      <View style={{ height: spacing.sm }} />
      <Button
        title="+ Add exercise"
        onPress={() => router.push('/exercise-picker')}
      />

      <View style={{ height: spacing.lg }} />
      <Button title="Finish workout" variant="success" onPress={handleFinish} />
      <View style={{ height: spacing.sm }} />
      <Button title="Discard" variant="danger" onPress={handleCancel} />
    </Screen>
  );
}

function SetRow({
  index,
  set,
  onChange,
  onDelete,
}: {
  index: number;
  set: SetEntry;
  onChange: (patch: Partial<SetEntry>) => void;
  onDelete: () => void;
}) {
  const [weight, setWeight] = useState(set.weight ? String(set.weight) : '');
  const [reps, setReps] = useState(set.reps ? String(set.reps) : '');

  return (
    <View style={[styles.setRow, set.isWarmup && styles.warmupRow]}>
      <Text style={[styles.setCol, styles.colIdx, styles.setText]}>
        {set.isWarmup ? 'W' : index}
      </Text>
      <TextInput
        style={[styles.setCol, styles.colInput, styles.input]}
        keyboardType="numeric"
        value={weight}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        onChangeText={(t) => {
          setWeight(t);
          const n = parseFloat(t);
          onChange({ weight: Number.isFinite(n) ? n : 0 });
        }}
      />
      <TextInput
        style={[styles.setCol, styles.colInput, styles.input]}
        keyboardType="numeric"
        value={reps}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        onChangeText={(t) => {
          setReps(t);
          const n = parseInt(t, 10);
          onChange({ reps: Number.isFinite(n) ? n : 0 });
        }}
      />
      <Pressable
        style={[styles.setCol, styles.colDone]}
        onPress={() => onChange({ completed: !set.completed })}
      >
        <Text
          style={[
            styles.check,
            { color: set.completed ? colors.success : colors.textMuted },
          ]}
        >
          {set.completed ? '✓' : '○'}
        </Text>
      </Pressable>
      <Pressable style={[styles.setCol, styles.colDel]} onPress={onDelete}>
        <Text style={styles.remove}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remove: { color: colors.danger, fontSize: font.small, fontWeight: '600' },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  warmupRow: { opacity: 0.8 },
  setCol: {},
  colIdx: { width: 28, textAlign: 'center', color: colors.text },
  colInput: { flex: 1, marginHorizontal: spacing.xs },
  colDone: { width: 40, alignItems: 'center' },
  colDel: { width: 28, alignItems: 'center' },
  setText: { color: colors.textMuted, fontSize: font.small },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontSize: font.body,
  },
  check: { fontSize: 20, fontWeight: '800' },
});
