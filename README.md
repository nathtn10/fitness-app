# Fitness App

A cross-platform (iOS + Android) fitness app built with **React Native + Expo**.

This iteration delivers the **foundation** plus a complete **Weightlifting &
Strength** section. The other planned sections (Cardio/GPS, Gym Integration,
Daily Activity) are architected and stubbed on the **More → Roadmap** screen.

## Features (this iteration)

### 🏋️ Weightlifting & Strength — complete
- **Log workouts** set by set: weight, reps, warmup flag, completion, with a
  built-in **rest timer** (presets + stopwatch).
- **Exercise catalog** mapped to muscle groups, equipment, and movement pattern.
- **Progress over time**: weekly volume, working-set counts, and an
  **estimated-1RM trend** per exercise.
- **Personal records**: heaviest weight, best estimated 1RM, and best set
  volume — with a celebration when you set a new PR mid-workout.
- **AI Assistant tab** (pull-based, on-device): tips are never shoved in your
  face — you ask when you want them. Three tools:
  - *Analyze my training* — transparent, rule-based flags for undertrained
    muscles, push/pull & upper/lower imbalances, stalled lifts, and recovery,
    plus a weekly-volume-by-muscle breakdown.
  - *What should I train today?* — a focus recommendation from recent history.
  - *Explain an exercise* — plain-language form cues, muscles worked, and
    common mistakes for any exercise in the catalog.

### Foundation
- Expo Router tab navigation (Home · Workout · Progress · AI · More).
- Local persistence via AsyncStorage behind a swappable repository.
- A pure, fully unit-tested domain layer.

## Architecture

```
app/                       Expo Router screens (file-based routing)
  _layout.tsx              Root stack + providers
  (tabs)/                  Tab screens: index, workout, progress, coach, more
  exercise-picker.tsx      Modal exercise picker
src/
  domain/                  Pure, framework-free business logic (unit-tested)
    types.ts               Core domain types
    exercises.ts           Exercise catalog + muscle-group mappings
    units.ts, dates.ts     Conversions & date helpers
    strength/
      oneRepMax.ts         1RM estimation (Epley/Brzycki)
      volume.ts            Volume load & per-muscle-group set counting
      personalRecords.ts   PR tracking & new-PR detection
      progress.ts          Weekly volume & 1RM trend aggregation
      suggestions.ts       Rule-based AI coaching engine
    __tests__/             Jest tests for the domain layer
  data/                    Persistence (AsyncStorage) + repository
  state/                   React context store wiring domain <-> UI
  ui/                      Theme, shared components, charts, rest timer
```

The **domain layer has zero React Native imports**, so all core logic is
unit-tested in plain Node with `ts-jest`. The UI and persistence layers depend
on the domain, never the reverse.

## Getting started

```bash
npm install
npx expo start        # then press i / a, or scan the QR with Expo Go
```

Requires the [Expo](https://expo.dev) toolchain. Runs on iOS, Android, and
Expo Go.

## Development

```bash
npm test          # run the domain unit tests (Jest)
npm run lint      # type-check with tsc --noEmit
```

The production JS bundle can be verified end-to-end with:

```bash
npx expo export --platform ios
```

## Roadmap

The strength section is live. The next sections are designed to slot into the
same domain/data/UI structure:

- **🏃 Cardio & Outdoor (Strava-style)** — GPS run/ride tracking via
  `expo-location`: distance, pace, elevation, calories, routes, and PRs.
- **📍 Gym Integration** — geofenced auto check-in and gym busyness insights.
- **👟 Daily Activity** — steps & active energy from Apple HealthKit and
  Google Fit, folded into daily goals.
- **🤝 Social Sharing** — optional sharing of workouts, routes, and
  achievements.
