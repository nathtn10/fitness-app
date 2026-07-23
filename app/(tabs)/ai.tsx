/**
 * AI Assistant tab.
 *
 * Pull-based by design: the assistant shows nothing until the user asks for it,
 * so guidance never gets shoved in their face. Three on-demand tools:
 *   1. Analyze my training  -> ranked coaching suggestions
 *   2. What should I train today?  -> focus recommendation
 *   3. Explain an exercise  -> plain-language form guide
 *
 * All logic runs on-device (see SECURITY.md). This screen is the seam where a
 * hosted LLM could later back the same three actions.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EXERCISE_CATALOG, muscleGroupLabel } from '../../src/domain/exercises';
import {
  explainExercise,
  recommendTodayFocus,
} from '../../src/domain/strength/explanations';
import {
  muscleGroupSetsInRange,
  sessionsInLastDays,
} from '../../src/domain/strength/progress';
import {
  generateSuggestions,
  type Suggestion,
} from '../../src/domain/strength/suggestions';
import {
  computeReadiness,
  readinessHeadline,
} from '../../src/domain/recovery/score';
import { useCardio } from '../../src/state/cardioStore';
import { useStore } from '../../src/state/store';
import { Body, Card, H1, H2, Loading, Screen } from '../../src/ui/components';
import { MuscleVolumeBars } from '../../src/ui/MuscleVolumeBars';
import { colors, font, radius, spacing } from '../../src/ui/theme';

type Panel = 'analyze' | 'today' | 'recovery' | 'explain' | null;

const TYPE_ICON: Record<Suggestion['type'], string> = {
  undertrained: '🎯',
  imbalance: '⚖️',
  stalled: '🧱',
  recovery: '😴',
  wellBalanced: '✅',
};

export default function AIScreen() {
  const { loading, sessions, profile } = useStore();
  const { activities } = useCardio();
  const [panel, setPanel] = useState<Panel>(null);

  const now = new Date();
  const readiness = useMemo(
    () => computeReadiness(sessions, activities, now),
    [sessions, activities],
  );
  const suggestions = useMemo(
    () => generateSuggestions(sessions, profile, now),
    [sessions, profile],
  );
  const focus = useMemo(
    () => recommendTodayFocus(sessions, profile, now),
    [sessions, profile],
  );
  const weeklySets = useMemo(
    () => muscleGroupSetsInRange(sessionsInLastDays(sessions, 7, now)),
    [sessions],
  );

  if (loading) return <Loading />;

  return (
    <Screen>
      <H1>AI Assistant</H1>
      <Body muted>
        Ask when you want guidance — nothing here runs until you tap it, and it
        all stays on your device.
      </Body>
      <View style={{ height: spacing.lg }} />

      <View style={styles.actions}>
        <ActionButton
          emoji="🧠"
          label="Analyze my training"
          active={panel === 'analyze'}
          onPress={() => setPanel(panel === 'analyze' ? null : 'analyze')}
        />
        <ActionButton
          emoji="📅"
          label="What should I train today?"
          active={panel === 'today'}
          onPress={() => setPanel(panel === 'today' ? null : 'today')}
        />
        <ActionButton
          emoji="🔋"
          label="Recovery & readiness"
          active={panel === 'recovery'}
          onPress={() => setPanel(panel === 'recovery' ? null : 'recovery')}
        />
        <ActionButton
          emoji="📖"
          label="Explain an exercise"
          active={panel === 'explain'}
          onPress={() => setPanel(panel === 'explain' ? null : 'explain')}
        />
      </View>

      <View style={{ height: spacing.lg }} />

      {panel === 'analyze' && (
        <>
          <AnalyzePanel
            suggestions={suggestions}
            hasHistory={sessions.length > 0}
          />
          {sessions.length > 0 && (
            <Card>
              <H2>Weekly volume by muscle</H2>
              <MuscleVolumeBars
                weeklySets={weeklySets}
                targets={profile.weeklySetTargets}
              />
            </Card>
          )}
        </>
      )}
      {panel === 'today' && (
        <Card>
          <H2>📅 Today’s focus</H2>
          <Body>{focus.message}</Body>
          {focus.prioritize.length > 0 && (
            <>
              <View style={{ height: spacing.sm }} />
              <Text style={styles.tag}>
                Prioritize: {focus.prioritize.map(muscleGroupLabel).join(', ')}
              </Text>
            </>
          )}
          {focus.rest.length > 0 && (
            <Text style={[styles.tag, { color: colors.warning }]}>
              Let recover: {focus.rest.map(muscleGroupLabel).join(', ')}
            </Text>
          )}
        </Card>
      )}
      {panel === 'recovery' && (
        <Card>
          <View style={styles.readinessHeader}>
            <Text style={styles.readinessScore}>{readiness.score}</Text>
            <View style={{ flex: 1 }}>
              <H2>{readinessHeadline(readiness.level)}</H2>
              <Body muted>
                Readiness from your training load — no wearable required.
              </Body>
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          {readiness.factors.map((f, i) => (
            <View key={i} style={styles.factorRow}>
              <Text
                style={[
                  styles.factorDot,
                  {
                    color:
                      f.impact === 'positive'
                        ? colors.success
                        : f.impact === 'negative'
                          ? colors.danger
                          : colors.textMuted,
                  },
                ]}
              >
                ●
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.factorLabel}>{f.label}</Text>
                <Body muted>{f.detail}</Body>
              </View>
            </View>
          ))}
        </Card>
      )}
      {panel === 'explain' && <ExplainPanel />}
    </Screen>
  );
}

function ActionButton({
  emoji,
  label,
  active,
  onPress,
}: {
  emoji: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.action, active && styles.actionActive]}
      onPress={onPress}
    >
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function AnalyzePanel({
  suggestions,
  hasHistory,
}: {
  suggestions: Suggestion[];
  hasHistory: boolean;
}) {
  if (!hasHistory) {
    return (
      <Card>
        <Body muted>Log a workout first and I’ll analyze your training.</Body>
      </Card>
    );
  }
  if (suggestions.length === 0) {
    return (
      <Card>
        <Body>✅ Nothing to flag — your recent training looks solid.</Body>
      </Card>
    );
  }
  return (
    <>
      {suggestions.map((s) => (
        <Card key={s.id}>
          <Text style={styles.suggestionTitle}>
            {TYPE_ICON[s.type]} {s.title}
          </Text>
          <Body muted>{s.detail}</Body>
        </Card>
      ))}
    </>
  );
}

function ExplainPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const explanation = useMemo(() => {
    const ex = EXERCISE_CATALOG.find((e) => e.id === selectedId);
    return ex ? explainExercise(ex) : null;
  }, [selectedId]);

  return (
    <>
      <Card>
        <H2>📖 Pick an exercise</H2>
        <View style={styles.chips}>
          {EXERCISE_CATALOG.map((e) => (
            <Pressable
              key={e.id}
              style={[styles.chip, selectedId === e.id && styles.chipActive]}
              onPress={() => setSelectedId(e.id)}
            >
              <Text style={styles.chipText}>{e.name}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {explanation && (
        <Card>
          <H2>{explanation.name}</H2>
          <Body>{explanation.summary}</Body>

          <Text style={styles.section}>Muscles worked</Text>
          <Body muted>
            {explanation.primaryMuscles.join(', ')}
            {explanation.secondaryMuscles.length > 0
              ? ` · secondary: ${explanation.secondaryMuscles.join(', ')}`
              : ''}
          </Body>

          <Text style={styles.section}>How to do it</Text>
          {explanation.cues.map((c, i) => (
            <Text key={i} style={styles.listItem}>
              {i + 1}. {c}
            </Text>
          ))}

          <Text style={styles.section}>Common mistakes</Text>
          {explanation.mistakes.map((m, i) => (
            <Text key={i} style={styles.listItem}>
              • {m}
            </Text>
          ))}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  actionActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  actionEmoji: { fontSize: 22, marginRight: spacing.md },
  actionLabel: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  suggestionTitle: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  tag: { color: colors.primary, fontSize: font.small, fontWeight: '600', marginTop: 2 },
  readinessHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  readinessScore: { color: colors.text, fontSize: 48, fontWeight: '800' },
  factorRow: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm },
  factorDot: { fontSize: font.body },
  factorLabel: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  chipText: { color: colors.text, fontSize: font.small },
  section: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  listItem: {
    color: colors.text,
    fontSize: font.body,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
});
