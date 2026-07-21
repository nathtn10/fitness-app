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
  - *Recovery & readiness* — a 0–100 readiness score from your training load
    (acute:chronic workload, monotony, rest days). Cross-domain (strength +
    cardio), no wearable required, every factor explained.

### 📸 Progress Photos — complete
- Capture or import photos, stored **private and on-device only**. Metadata
  (including GPS) is stripped on import by re-encoding.
- **Side-by-side comparison** with *measured* deltas — days elapsed, bodyweight
  change, and estimated-1RM movement on lifts trained in the span. No black-box
  pixel analysis; the "what changed" is real data.

### 🥗 Nutrition — complete
- **Meal logging** with a built-in food database and macro/calorie tracking
  against daily goals.
- **Natural-language editing** (on-device, no LLM): "swap the rice for
  cauliflower rice, double the chicken, add 2 eggs" is parsed and applied
  instantly, recalculating everything. Also supports add/remove/set/scale and
  direct per-ingredient gram edits.
- Daily totals with protein/carb/fat progress bars and remaining calories.

### 🏃 Cardio & Outdoor (GPS) — complete
- **Live GPS tracking** for runs, rides, walks, and hikes with pause/resume.
- **Metrics**: distance, moving time, pace, average speed, elevation gain (with
  noise filtering), and MET-based calorie estimates.
- **Per-kilometer splits** and a self-contained **route sketch** (SVG polyline —
  no map API key, no network).
- **Personal records per activity type** (longest distance/duration, most
  elevation, fastest pace) and **milestone achievements**, celebrated on finish.

### 📍 Gym Integration — complete
- **Auto-detect check-ins** via on-device geofencing (haversine + a
  dwell-debounced state machine that ignores GPS jitter and drive-bys).
- **Busyness insights** derived from your visit history (a 7×24 heatmap that
  merges cleanly with crowd data later), with a typical-by-hour chart.
- **Visit history** and live "you're at the gym" status.
- Foreground-only location that never leaves the device (see SECURITY.md).

### Foundation
- Expo Router tab navigation (Home · Workout · Progress · AI · More), plus
  ambient screens (Gym) reached from Home/More.
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

## Backend

The app is offline-first (everything on-device). The backend design — accounts,
multi-device sync, social feed, hosted cross-domain AI, crowd-sourced gym
busyness, and daily-activity ingestion — is specified in **[`BACKEND.md`](./BACKEND.md)**,
targeting **Supabase**. It ships with two concrete contract artifacts:

- **[`src/api/`](./src/api)** — shared TypeScript DTOs, endpoint payloads, and
  the `FitnessApiClient` interface the app programs against.
- **[`supabase/schema.sql`](./supabase/schema.sql)** — the Postgres schema, RLS
  policies, and triggers.

The per-domain repository is the only seam that changes; the domain and UI
layers stay untouched.

## Roadmap

Shipped: Strength, AI Assistant, Cardio/GPS, Gym, Nutrition, Progress Photos,
Recovery. Next, per `BACKEND.md`:

- **☁️ Cloud sync & accounts** — auth + multi-device backup/sync (Phase 0).
- **🤝 Social** — follows, feed, reactions, granular privacy (Phase 1).
- **🧠 Hosted cross-domain AI** — LLM coach with on-device fallback (Phase 2).
- **📊 Crowd gym busyness** — anonymized aggregation (Phase 3).
- **👟 Daily Activity** — HealthKit / Google Fit via a dev build (Phase 4).
