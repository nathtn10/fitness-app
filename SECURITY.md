# Security & Privacy

This app handles sensitive personal data — location traces, health metrics,
body photos, and (later) a social graph. This document records the security
posture and the rules engineers must follow as the app grows.

## Current posture (this iteration)

- **No secrets in the repo.** No API keys, tokens, or credentials are committed.
  Anything sensitive must come from environment config / secure storage, never
  source. CI should run secret scanning.
- **Input is sanitized at the boundary.** All free-text (`src/lib/sanitize.ts`)
  and all numeric set input (`src/ui/SetRow.tsx`) is length-capped and cleaned
  before it reaches the store. Validate at entry, not after storage.
- **No dynamic code execution.** No `eval`, `new Function`, `WebView`, or
  `dangerouslySetInnerHTML` anywhere in the codebase.
- **Local-only data.** Workout data currently lives on-device in AsyncStorage.
  Nothing leaves the device yet, so there is no network attack surface today.

## Rules for upcoming features

These features are on the roadmap and each one widens the attack/privacy
surface. The requirements below are non-negotiable when they're built.

### Location & GPS (Cardio, Gym auto-detect)
- Request the **minimum** permission tier (when-in-use before always/background).
- Never persist raw home/work coordinates in plaintext to a shared backend.
  Apply **start/end-point privacy zones** (Strava-style) before any route is
  shared or synced.
- Geofencing for gym auto-detect must be **on-device**; do not stream continuous
  location to a server.

### Health data (HealthKit / Google Fit)
- HealthKit/Fit data is subject to platform rules: **never** send it to
  third-party analytics or advertising SDKs. Keep it on-device or in the user's
  own encrypted account only.
- Request read scopes granularly; write only what the user explicitly logs.

### Photos (progress & meal photos)
- Store under app-private storage, not the shared camera roll, unless the user
  opts in. Strip EXIF **GPS** metadata before any upload or share.
- Progress photos are among the most sensitive data here — treat them as
  private-by-default and require explicit action to share.

### AI features (coach, workout explanations, NL nutrition edits)
- The current coach engine is **rule-based and runs on-device** — no data
  leaves the phone. If/when we call a hosted LLM:
  - Send the **minimum** context needed; never send raw identifiers, precise
    location, or photos unless the feature requires it and the user consents.
  - Treat any model output as **untrusted**: it is displayed as text, never
    executed, never used to build a query or file path.
  - User free-text flows into prompts, so continue sanitizing input
    (prompt-injection hygiene) and never let model output trigger app actions
    without a user confirmation step.

### Social feed & sharing
- **Private by default.** Every shareable item (PR, run, split, meal) is hidden
  until the user explicitly shares it, with per-item and per-field visibility
  controls (the "option to hide things" requirement).
- Server-side authorization on every read: a user must never be able to fetch
  another user's private data by guessing an ID. Enforce ownership checks on the
  backend, not just by hiding UI.
- Rate-limit and validate all writes; treat all client input as hostile.

### Backend & sync (when introduced)
- All transport over TLS. Authenticate every request; scope every query to the
  authenticated user.
- Encrypt sensitive columns at rest. Keep an audit log for data access.
- Provide account deletion and data export (GDPR/CCPA); document data retention.

## Reporting

Found a vulnerability? Please open a private security advisory rather than a
public issue.
