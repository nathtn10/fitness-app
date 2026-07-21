import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useGym } from '../../src/state/gymStore';
import { useStore } from '../../src/state/store';
import {
  Body,
  Button,
  Card,
  H1,
  H2,
  Loading,
  Screen,
  StatTile,
} from '../../src/ui/components';
import { formatRelativeDate, formatVolume } from '../../src/ui/format';
import { spacing } from '../../src/ui/theme';
import { getExercise } from '../../src/domain/exercises';
import { sessionsInLastDays } from '../../src/domain/strength/progress';
import {
  sessionVolume,
  sessionWorkingSets,
} from '../../src/domain/strength/volume';

export default function DashboardScreen() {
  const router = useRouter();
  const { loading, sessions, profile, activeSession, startWorkout } = useStore();
  const { gyms, checkIn } = useGym();
  const currentGym = gyms.find((g) => g.id === checkIn.currentGymId) ?? null;

  if (loading) return <Loading />;

  const now = new Date();
  const thisWeek = sessionsInLastDays(sessions, 7, now);
  const weekVolume = thisWeek.reduce((sum, s) => sum + sessionVolume(s), 0);
  const weekSets = thisWeek.reduce((sum, s) => sum + sessionWorkingSets(s), 0);
  const recent = sessions.slice(0, 3);

  return (
    <Screen>
      <H1>Hi, {profile.displayName} 👋</H1>
      <Body muted>Let&apos;s make today count.</Body>

      <View style={{ height: spacing.lg }} />

      <Card>
        <H2>This week</H2>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatTile label="Sessions" value={String(thisWeek.length)} />
          <StatTile label="Working sets" value={String(Math.round(weekSets))} />
          <StatTile
            label="Volume"
            value={formatVolume(weekVolume, profile.unit)}
          />
        </View>
      </Card>

      {activeSession ? (
        <Card>
          <H2>Workout in progress</H2>
          <Body muted>
            {activeSession.name} · {activeSession.exercises.length} exercise
            {activeSession.exercises.length === 1 ? '' : 's'}
          </Body>
          <View style={{ height: spacing.md }} />
          <Button
            title="Resume workout"
            onPress={() => router.push('/workout')}
          />
        </Card>
      ) : (
        <Card>
          <H2>Ready to train?</H2>
          <Body muted>Start a fresh session and log your sets as you go.</Body>
          <View style={{ height: spacing.md }} />
          <Button
            title="Start workout"
            onPress={() => {
              startWorkout();
              router.push('/workout');
            }}
          />
        </Card>
      )}

      <Card>
        <H2>📍 Gym</H2>
        {currentGym ? (
          <Body>You&apos;re at {currentGym.name}.</Body>
        ) : (
          <Body muted>
            {gyms.length > 0
              ? 'Not at a gym right now.'
              : 'Set up auto-detect to track gym check-ins and busyness.'}
          </Body>
        )}
        <View style={{ height: spacing.md }} />
        <Button
          title={gyms.length > 0 ? 'Open gym' : 'Set up gym'}
          variant="ghost"
          onPress={() => router.push('/gym')}
        />
      </Card>

      {sessions.length > 0 ? (
        <Button
          title="🤖 Ask the AI assistant"
          variant="ghost"
          onPress={() => router.push('/ai')}
        />
      ) : null}

      <View style={{ height: spacing.lg }} />
      <H2>Recent workouts</H2>
      {recent.length === 0 ? (
        <Body muted>No workouts logged yet. Your history will appear here.</Body>
      ) : (
        recent.map((s) => (
          <Card key={s.id}>
            <Body>{s.name}</Body>
            <Body muted>
              {formatRelativeDate(s.startedAt, now)} ·{' '}
              {s.exercises
                .map((l) => getExercise(l.exerciseId)?.name ?? l.exerciseId)
                .slice(0, 3)
                .join(', ')}
              {s.exercises.length > 3 ? '…' : ''}
            </Body>
          </Card>
        ))
      )}
    </Screen>
  );
}
