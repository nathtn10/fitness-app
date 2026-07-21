/**
 * Progress photos gallery. Photos are private-by-default, stored on-device with
 * metadata (including GPS) stripped on import. Select two to compare.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePhotos } from '../src/state/photosStore';
import { Body, Button, Card, H1, H2, Loading, Screen } from '../src/ui/components';
import { formatRelativeDate } from '../src/ui/format';
import { colors, font, radius, spacing } from '../src/ui/theme';

export default function PhotosScreen() {
  const router = useRouter();
  const { loading, photos, addFromLibrary, addFromCamera, deletePhoto } =
    usePhotos();
  const [weight, setWeight] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  if (loading) return <Loading />;

  const bodyweight = () => {
    const n = parseFloat(weight);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const add = async (source: 'library' | 'camera') => {
    const fn = source === 'library' ? addFromLibrary : addFromCamera;
    const ok = await fn(bodyweight());
    if (!ok) {
      Alert.alert(
        'Could not add photo',
        'Permission was denied or no photo was selected.',
      );
      return;
    }
    setWeight('');
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 2) return [prev[1], id]; // keep last two
      return [...prev, id];
    });
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete photo?', 'This permanently removes it from your device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePhoto(id) },
    ]);
  };

  return (
    <Screen>
      <H1>Progress Photos</H1>
      <Body muted>
        Private and stored only on your device. Location metadata is stripped on
        import.
      </Body>

      <View style={{ height: spacing.md }} />
      <Card>
        <H2>Add a photo</H2>
        <TextInput
          style={styles.input}
          placeholder="Bodyweight (optional)"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
          maxLength={6}
        />
        <View style={{ height: spacing.sm }} />
        <View style={styles.addRow}>
          <View style={{ flex: 1 }}>
            <Button title="📷 Camera" onPress={() => add('camera')} />
          </View>
          <View style={{ width: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Button
              title="🖼️ Library"
              variant="ghost"
              onPress={() => add('library')}
            />
          </View>
        </View>
      </Card>

      {selected.length === 2 ? (
        <Button
          title="Compare selected"
          variant="success"
          onPress={() =>
            router.push(`/photo-compare?a=${selected[0]}&b=${selected[1]}`)
          }
        />
      ) : photos.length >= 2 ? (
        <Body muted>Tap two photos to compare them.</Body>
      ) : null}

      <View style={{ height: spacing.md }} />

      {photos.length === 0 ? (
        <Body muted>No photos yet. Add your first above.</Body>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => {
            const isSelected = selected.includes(p.id);
            return (
              <Pressable
                key={p.id}
                style={[styles.tile, isSelected && styles.tileSelected]}
                onPress={() => toggleSelect(p.id)}
                onLongPress={() => confirmDelete(p.id)}
              >
                <Image source={{ uri: p.uri }} style={styles.image} />
                <View style={styles.tileMeta}>
                  <Text style={styles.tileDate}>
                    {formatRelativeDate(p.takenAt)}
                  </Text>
                  {p.bodyweightKg ? (
                    <Text style={styles.tileWeight}>{p.bodyweightKg} kg</Text>
                  ) : null}
                </View>
                {isSelected ? <View style={styles.badge} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
      {photos.length > 0 ? (
        <Body muted>Long-press a photo to delete it.</Body>
      ) : null}
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
  addRow: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileSelected: { borderColor: colors.primary },
  image: { width: '100%', height: 200, backgroundColor: colors.surfaceAlt },
  tileMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  tileDate: { color: colors.text, fontSize: font.small },
  tileWeight: { color: colors.textMuted, fontSize: font.small },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
});
