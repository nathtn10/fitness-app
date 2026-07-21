import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CardioProvider } from '../src/state/cardioStore';
import { GymProvider } from '../src/state/gymStore';
import { NutritionProvider } from '../src/state/nutritionStore';
import { PhotosProvider } from '../src/state/photosStore';
import { StoreProvider } from '../src/state/store';
import { colors } from '../src/ui/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <GymProvider>
          <CardioProvider>
            <NutritionProvider>
             <PhotosProvider>
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
                <Stack.Screen name="cardio" options={{ title: 'Activities' }} />
                <Stack.Screen
                  name="record"
                  options={{ title: 'Recording', gestureEnabled: false }}
                />
                <Stack.Screen
                  name="activity/[id]"
                  options={{ title: 'Activity' }}
                />
                <Stack.Screen name="nutrition" options={{ title: 'Nutrition' }} />
                <Stack.Screen
                  name="meal-editor"
                  options={{ title: 'Meal' }}
                />
                <Stack.Screen name="photos" options={{ title: 'Progress Photos' }} />
                <Stack.Screen
                  name="photo-compare"
                  options={{ title: 'Compare' }}
                />
              </Stack>
             </PhotosProvider>
            </NutritionProvider>
          </CardioProvider>
        </GymProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
