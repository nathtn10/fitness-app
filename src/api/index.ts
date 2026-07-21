/**
 * Public surface of the backend API contract.
 *
 * Pure types only — importing this pulls in no runtime code and no vendor SDK.
 * The Supabase implementation of `FitnessApiClient` lives in a separate adapter
 * (see BACKEND.md); everything here is the shared client/server contract.
 */
export * from './common';
export * from './rows';
export * from './social';
export * from './endpoints';
export * from './client';
