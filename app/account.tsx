/**
 * Account screen: sign in / create account, cloud-sync status, and sign out.
 * When the backend isn't configured, it explains that the app is local-only.
 */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../src/state/authStore';
import { useSync } from '../src/state/syncStore';
import { Body, Button, Card, H1, H2, Screen } from '../src/ui/components';
import { formatRelativeDate } from '../src/ui/format';
import { colors, font, radius, spacing } from '../src/ui/theme';

export default function AccountScreen() {
  const { enabled, loading, session, signIn, signUp, signOut } = useAuth();
  const { status, lastSyncedAt, lastError, syncNow } = useSync();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <Screen>
        <H1>Account</H1>
        <Card>
          <H2>Local-only mode</H2>
          <Body muted>
            Cloud sync isn&apos;t configured in this build. All your data lives
            on this device. Set EXPO_PUBLIC_SUPABASE_URL and
            EXPO_PUBLIC_SUPABASE_ANON_KEY to enable accounts and multi-device
            sync (see BACKEND.md).
          </Body>
        </Card>
      </Screen>
    );
  }

  const submit = async (kind: 'in' | 'up') => {
    setBusy(true);
    setError(null);
    const err = await (kind === 'in' ? signIn(email, password) : signUp(email, password));
    setBusy(false);
    if (err) setError(err.message);
    else {
      setEmail('');
      setPassword('');
      void syncNow();
    }
  };

  if (loading) {
    return (
      <Screen>
        <H1>Account</H1>
        <Body muted>Checking your session…</Body>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <H1>Account</H1>
        <Body muted>
          Sign in to back up your data and sync across devices. The app stays
          fully usable without an account.
        </Body>
        <View style={{ height: spacing.md }} />
        <Card>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View style={{ height: spacing.sm }} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ height: spacing.md }} />
          <Button
            title={busy ? 'Please wait…' : 'Sign in'}
            onPress={() => submit('in')}
            disabled={busy || !email || !password}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title="Create account"
            variant="ghost"
            onPress={() => submit('up')}
            disabled={busy || !email || !password}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Account</H1>
      <Card>
        <H2>Signed in</H2>
        <Body muted>User id: {session.userId}</Body>
      </Card>

      <Card>
        <H2>Sync</H2>
        <Body muted>
          {status === 'syncing'
            ? 'Syncing…'
            : status === 'error'
              ? `Last sync failed: ${lastError}`
              : lastSyncedAt
                ? `Last synced ${formatRelativeDate(lastSyncedAt)}`
                : 'Not synced yet.'}
        </Body>
        <View style={{ height: spacing.md }} />
        <Button
          title="Sync now"
          onPress={() => void syncNow()}
          disabled={status === 'syncing'}
        />
      </Card>

      <Button title="Sign out" variant="danger" onPress={() => void signOut()} />
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
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.sm },
});
