/**
 * Backend configuration.
 *
 * The app is fully functional offline with no backend. Cloud features (auth +
 * sync) turn on only when a Supabase project is configured via public env vars
 * (EXPO_PUBLIC_*). With no config, `isBackendConfigured` is false and the app
 * behaves exactly as the local-only build — no auth gate, no network.
 *
 * Set these in a `.env` file or the EAS build environment:
 *   EXPO_PUBLIC_SUPABASE_URL=...
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const backendConfig = { url, anonKey };

export const isBackendConfigured = url.length > 0 && anonKey.length > 0;
