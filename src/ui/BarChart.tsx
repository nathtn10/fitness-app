/** Dependency-free bar chart built from Views. Good enough for trend at a glance. */
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from './theme';

export interface BarDatum {
  label: string;
  value: number;
}

export function BarChart({
  data,
  height = 120,
  color = colors.primary,
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
}) {
  if (data.length === 0) {
    return <Text style={styles.empty}>Not enough data yet.</Text>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.container, { height: height + 24 }]}>
      {data.map((d, i) => {
        const barHeight = Math.max(2, (d.value / max) * height);
        return (
          <View key={`${d.label}-${i}`} style={styles.column}>
            <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
            <Text style={styles.label} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: {
    width: '80%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: font.tiny,
    marginTop: spacing.xs,
  },
  empty: { color: colors.textMuted, fontSize: font.small },
});
