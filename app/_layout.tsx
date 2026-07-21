import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GymProvider } from '../src/state/gymStore';
import { StoreProvider } from '../src/state/store';
import { colors } from '../src/ui/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <GymProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="exercise-picker"
              options={{ presentation: 'modal', title: 'Add Exercise' }}
            />
            <Stack.Screen name="gym" options={{ title: 'Gym' }} />
          </Stack>
        </GymProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
