/**
 * Draws a recorded GPS track as a normalized polyline. This is a self-contained
 * route sketch (no map tiles, no API key, no network) — coordinates are
 * projected into the view box with an equirectangular approximation that
 * corrects longitude for latitude, so short routes keep their real shape.
 *
 * A full slippy map (react-native-maps) can replace this later; the component
 * boundary stays the same.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { TrackPoint } from '../domain/cardio/types';
import { colors, font, radius, spacing } from './theme';

const WIDTH = 300;
const HEIGHT = 180;
const PADDING = 16;

export function RoutePreview({ points }: { points: TrackPoint[] }) {
  const projected = useMemo(() => projectPoints(points), [points]);

  if (projected.length < 2) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>No route to display.</Text>
      </View>
    );
  }

  const polyline = projected.map((p) => `${p.x},${p.y}`).join(' ');
  const start = projected[0];
  const end = projected[projected.length - 1];

  return (
    <View style={styles.container}>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Polyline
          points={polyline}
          fill="none"
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={start.x} cy={start.y} r={5} fill={colors.success} />
        <Circle cx={end.x} cy={end.y} r={5} fill={colors.danger} />
      </Svg>
    </View>
  );
}

interface Projected {
  x: number;
  y: number;
}

function projectPoints(points: TrackPoint[]): Projected[] {
  if (points.length === 0) return [];

  const latRef = (points[0].latitude * Math.PI) / 180;
  const cosLat = Math.cos(latRef);
  // Equirectangular: scale longitude by cos(lat) so the aspect ratio is real.
  const raw = points.map((p) => ({
    x: p.longitude * cosLat,
    y: p.latitude,
  }));

  const xs = raw.map((r) => r.x);
  const ys = raw.map((r) => r.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;
  // Preserve aspect ratio: fit the larger span, center the smaller.
  const scale = Math.min(
    (WIDTH - 2 * PADDING) / spanX,
    (HEIGHT - 2 * PADDING) / spanY,
  );
  const offsetX = (WIDTH - spanX * scale) / 2;
  const offsetY = (HEIGHT - spanY * scale) / 2;

  return raw.map((r) => ({
    x: offsetX + (r.x - minX) * scale,
    // Invert Y: screen y grows downward, latitude grows upward.
    y: HEIGHT - (offsetY + (r.y - minY) * scale),
  }));
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  empty: {
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: colors.textMuted, fontSize: font.small, padding: spacing.md },
});
