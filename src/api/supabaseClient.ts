/**
 * Supabase implementation of `FitnessApiClient` — the single place the vendor
 * SDK is used. Everything else in the app depends on the contract, not Supabase.
 *
 * Phase 0 implements auth, profile/privacy, offline sync (push/pull for the
 * five domains with local repositories), and photo storage. Social, the AI
 * coach, busyness, and account export return a clear "not available yet" error
 * until their phases land.
 *
 * NOTE: verified here by typecheck + bundling only — this sandbox has no live
 * Supabase project. Validate against a real project before shipping.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { backendConfig } from '../config';
import { PHASE0_TABLES, TABLES, type Phase0Table } from '../sync/tables';
import type { ApiError, ApiResult, Page, PageQuery } from './common';
import type { AuthSession, FitnessApiClient } from './client';
import type {
  AddCommentRequest,
  BusynessQuery,
  BusynessResponse,
  CoachRequest,
  CoachResponse,
  CommentsResponse,
  CreatePostRequest,
  DataExportResponse,
  ChangeSet,
  FeedQuery,
  FeedResponse,
  ReactRequest,
  SyncPullRequest,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from './endpoints';
import type { PrivacySettings, ProfileRow } from './rows';
import type { FeedComment, FollowState, PublicProfile } from './social';

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}
function err<T>(code: string, message: string): ApiResult<T> {
  return { ok: false, error: { code, message } };
}
function fromException<T>(e: unknown): ApiResult<T> {
  const message = e instanceof Error ? e.message : 'Unknown error';
  return { ok: false, error: { code: 'exception', message } };
}
const NOT_AVAILABLE: ApiError = {
  code: 'not_available',
  message: 'This feature ships in a later backend phase.',
};

const PULL_PAGE = 500;

export class SupabaseApiClient implements FitnessApiClient {
  private sb: SupabaseClient;

  constructor() {
    this.sb = createClient(backendConfig.url, backendConfig.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  // --- Auth ---------------------------------------------------------------

  async signUpWithEmail(email: string, password: string) {
    try {
      const { data, error } = await this.sb.auth.signUp({ email, password });
      if (error) return err<AuthSession>('auth', error.message);
      if (!data.session) {
        return err<AuthSession>('confirm_email', 'Check your email to confirm your account.');
      }
      return ok(this.mapSession(data.session));
    } catch (e) {
      return fromException<AuthSession>(e);
    }
  }

  async signInWithEmail(email: string, password: string) {
    try {
      const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
      if (error) return err<AuthSession>('auth', error.message);
      return ok(this.mapSession(data.session!));
    } catch (e) {
      return fromException<AuthSession>(e);
    }
  }

  async signInWithOAuth(_provider: 'apple' | 'google') {
    // OAuth needs the deep-link redirect flow (expo-web-browser); Phase 1.
    return { ok: false as const, error: NOT_AVAILABLE };
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async getSession(): Promise<AuthSession | null> {
    const { data } = await this.sb.auth.getSession();
    return data.session ? this.mapSession(data.session) : null;
  }

  private mapSession(s: {
    user: { id: string };
    access_token: string;
    expires_at?: number;
  }): AuthSession {
    return {
      userId: s.user.id,
      accessToken: s.access_token,
      expiresAt: new Date((s.expires_at ?? 0) * 1000).toISOString(),
    };
  }

  // --- Profile & privacy --------------------------------------------------

  async getMyProfile() {
    try {
      const uid = await this.uid();
      if (!uid) return err<ProfileRow>('auth', 'Not signed in.');
      const { data, error } = await this.sb.from('profiles').select('*').eq('id', uid).single();
      if (error) return err<ProfileRow>('db', error.message);
      return ok(this.profileFromDb(data));
    } catch (e) {
      return fromException<ProfileRow>(e);
    }
  }

  async updateMyProfile(patch: Partial<ProfileRow>) {
    try {
      const uid = await this.uid();
      if (!uid) return err<ProfileRow>('auth', 'Not signed in.');
      const { data, error } = await this.sb
        .from('profiles')
        .update(this.profileToDb(patch))
        .eq('id', uid)
        .select('*')
        .single();
      if (error) return err<ProfileRow>('db', error.message);
      return ok(this.profileFromDb(data));
    } catch (e) {
      return fromException<ProfileRow>(e);
    }
  }

  async getPrivacySettings() {
    try {
      const uid = await this.uid();
      if (!uid) return err<PrivacySettings>('auth', 'Not signed in.');
      const { data, error } = await this.sb
        .from('privacy_settings')
        .select('*')
        .eq('user_id', uid)
        .single();
      if (error) return err<PrivacySettings>('db', error.message);
      return ok(this.privacyFromDb(data));
    } catch (e) {
      return fromException<PrivacySettings>(e);
    }
  }

  async updatePrivacySettings(patch: Partial<PrivacySettings>) {
    try {
      const uid = await this.uid();
      if (!uid) return err<PrivacySettings>('auth', 'Not signed in.');
      const { data, error } = await this.sb
        .from('privacy_settings')
        .update(this.privacyToDb(patch))
        .eq('user_id', uid)
        .select('*')
        .single();
      if (error) return err<PrivacySettings>('db', error.message);
      return ok(this.privacyFromDb(data));
    } catch (e) {
      return fromException<PrivacySettings>(e);
    }
  }

  // --- Sync ---------------------------------------------------------------

  async push(req: SyncPushRequest): Promise<ApiResult<SyncPushResponse>> {
    try {
      const changes = req.changes as Record<string, Record<string, unknown>[]>;
      for (const table of Object.keys(changes) as Phase0Table[]) {
        const ser = TABLES[table];
        const rows = changes[table];
        if (!ser || !rows?.length) continue;
        const dbRows = rows.map((r) => ser.toDb(r as never));
        const { error } = await this.sb.from(ser.db).upsert(dbRows);
        if (error) return err<SyncPushResponse>('db', `${table}: ${error.message}`);
      }
      return ok({ conflicts: [], cursor: new Date().toISOString() });
    } catch (e) {
      return fromException<SyncPushResponse>(e);
    }
  }

  async pull(req: SyncPullRequest): Promise<ApiResult<SyncPullResponse>> {
    try {
      const changes: ChangeSet = {};
      let cursor = req.since ?? '';
      let hasMore = false;
      const limit = req.limit ?? PULL_PAGE;

      for (const table of PHASE0_TABLES) {
        const ser = TABLES[table];
        let q = this.sb.from(ser.db).select('*').order('updated_at', { ascending: true }).limit(limit);
        if (req.since) q = q.gt('updated_at', req.since);
        const { data, error } = await q;
        if (error) return err<SyncPullResponse>('db', `${table}: ${error.message}`);
        if (data && data.length) {
          (changes as Record<string, unknown[]>)[table] = data.map((row) => ser.fromDb(row));
          const last = data[data.length - 1].updated_at as string;
          if (last > cursor) cursor = last;
          if (data.length >= limit) hasMore = true;
        }
      }
      return ok({ changes, cursor: cursor || new Date(0).toISOString(), hasMore });
    } catch (e) {
      return fromException<SyncPullResponse>(e);
    }
  }

  // --- Photo storage ------------------------------------------------------

  async uploadProgressPhoto(localUri: string, photoId: string) {
    try {
      const uid = await this.uid();
      if (!uid) return err<string>('auth', 'Not signed in.');
      const path = `${uid}/${photoId}.jpg`;
      const blob = await (await fetch(localUri)).blob();
      const { error } = await this.sb.storage
        .from('progress-photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) return err<string>('storage', error.message);
      return ok(path);
    } catch (e) {
      return fromException<string>(e);
    }
  }

  async signedPhotoUrl(storagePath: string) {
    try {
      const { data, error } = await this.sb.storage
        .from('progress-photos')
        .createSignedUrl(storagePath, 3600);
      if (error) return err<string>('storage', error.message);
      return ok(data.signedUrl);
    } catch (e) {
      return fromException<string>(e);
    }
  }

  // --- Deferred to later phases ------------------------------------------

  async searchUsers(_q: string, _page?: PageQuery): Promise<ApiResult<Page<PublicProfile>>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async getProfile(_userId: string): Promise<ApiResult<PublicProfile>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async follow(_userId: string): Promise<ApiResult<FollowState>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async unfollow(_userId: string): Promise<ApiResult<FollowState>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async getFeed(_query: FeedQuery): Promise<ApiResult<FeedResponse>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async createPost(_req: CreatePostRequest): Promise<ApiResult<void>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async deletePost(_postId: string): Promise<ApiResult<void>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async react(_req: ReactRequest): Promise<ApiResult<void>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async addComment(_req: AddCommentRequest): Promise<ApiResult<FeedComment>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async getComments(_postId: string, _page?: PageQuery): Promise<ApiResult<CommentsResponse>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async coach(_req: CoachRequest): Promise<ApiResult<CoachResponse>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async busyness(_query: BusynessQuery): Promise<ApiResult<BusynessResponse>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async exportMyData(): Promise<ApiResult<DataExportResponse>> {
    return { ok: false, error: NOT_AVAILABLE };
  }
  async deleteMyAccount(): Promise<ApiResult<void>> {
    return { ok: false, error: NOT_AVAILABLE };
  }

  // --- helpers ------------------------------------------------------------

  private async uid(): Promise<string | null> {
    const { data } = await this.sb.auth.getUser();
    return data.user?.id ?? null;
  }

  private profileFromDb(d: Record<string, any>): ProfileRow {
    return {
      id: d.id,
      username: d.username,
      displayName: d.display_name,
      unit: d.unit,
      bodyweightKg: d.bodyweight_kg ?? undefined,
      weeklySetTargets: d.weekly_set_targets ?? {},
      nutritionGoals: d.nutrition_goals ?? {},
      avatarUrl: d.avatar_url ?? undefined,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }
  private profileToDb(p: Partial<ProfileRow>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (p.username !== undefined) out.username = p.username;
    if (p.displayName !== undefined) out.display_name = p.displayName;
    if (p.unit !== undefined) out.unit = p.unit;
    if (p.bodyweightKg !== undefined) out.bodyweight_kg = p.bodyweightKg;
    if (p.weeklySetTargets !== undefined) out.weekly_set_targets = p.weeklySetTargets;
    if (p.nutritionGoals !== undefined) out.nutrition_goals = p.nutritionGoals;
    if (p.avatarUrl !== undefined) out.avatar_url = p.avatarUrl;
    return out;
  }
  private privacyFromDb(d: Record<string, any>): PrivacySettings {
    return {
      userId: d.user_id,
      defaultVisibility: d.default_visibility,
      shareWorkouts: d.share_workouts,
      shareActivities: d.share_activities,
      shareNutrition: d.share_nutrition,
      shareSteps: d.share_steps,
      discoverable: d.discoverable,
    };
  }
  private privacyToDb(p: Partial<PrivacySettings>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (p.defaultVisibility !== undefined) out.default_visibility = p.defaultVisibility;
    if (p.shareWorkouts !== undefined) out.share_workouts = p.shareWorkouts;
    if (p.shareActivities !== undefined) out.share_activities = p.shareActivities;
    if (p.shareNutrition !== undefined) out.share_nutrition = p.shareNutrition;
    if (p.shareSteps !== undefined) out.share_steps = p.shareSteps;
    if (p.discoverable !== undefined) out.discoverable = p.discoverable;
    return out;
  }
}

let singleton: SupabaseApiClient | null = null;

/** Lazily construct the adapter (only when the backend is configured). */
export function getApiClient(): SupabaseApiClient {
  if (!singleton) singleton = new SupabaseApiClient();
  return singleton;
}
