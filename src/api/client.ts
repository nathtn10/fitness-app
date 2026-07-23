/**
 * The backend surface the app programs against.
 *
 * The app's per-domain repositories (src/data/*Repository.ts) stay the seam:
 * today they read/write AsyncStorage; with the backend they additionally push
 * to and pull from an implementation of this interface. The domain and UI
 * layers never change. See BACKEND.md § "Client integration".
 *
 * This is a pure interface (no Supabase import) so the app depends on the
 * contract, not the vendor — the Supabase implementation lives in one adapter.
 */
import type { ApiResult, Page, PageQuery } from './common';
import type {
  AddCommentRequest,
  BusynessQuery,
  BusynessResponse,
  CoachRequest,
  CoachResponse,
  CommentsResponse,
  CreatePostRequest,
  DataExportResponse,
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

export interface AuthSession {
  userId: string;
  accessToken: string;
  expiresAt: string;
}

export interface FitnessApiClient {
  // --- Auth ---
  signUpWithEmail(email: string, password: string): Promise<ApiResult<AuthSession>>;
  signInWithEmail(email: string, password: string): Promise<ApiResult<AuthSession>>;
  signInWithOAuth(provider: 'apple' | 'google'): Promise<ApiResult<AuthSession>>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;

  // --- Profile & privacy ---
  getMyProfile(): Promise<ApiResult<ProfileRow>>;
  updateMyProfile(patch: Partial<ProfileRow>): Promise<ApiResult<ProfileRow>>;
  getPrivacySettings(): Promise<ApiResult<PrivacySettings>>;
  updatePrivacySettings(
    patch: Partial<PrivacySettings>,
  ): Promise<ApiResult<PrivacySettings>>;

  // --- Sync (offline-first) ---
  push(req: SyncPushRequest): Promise<ApiResult<SyncPushResponse>>;
  pull(req: SyncPullRequest): Promise<ApiResult<SyncPullResponse>>;

  // --- Photo storage ---
  /** Upload an already-sanitized local file; returns its private storage path. */
  uploadProgressPhoto(localUri: string, photoId: string): Promise<ApiResult<string>>;
  /** Short-lived signed URL to view a stored photo. */
  signedPhotoUrl(storagePath: string): Promise<ApiResult<string>>;

  // --- Social graph ---
  searchUsers(query: string, page?: PageQuery): Promise<ApiResult<Page<PublicProfile>>>;
  getProfile(userId: string): Promise<ApiResult<PublicProfile>>;
  follow(userId: string): Promise<ApiResult<FollowState>>;
  unfollow(userId: string): Promise<ApiResult<FollowState>>;

  // --- Feed ---
  getFeed(query: FeedQuery): Promise<ApiResult<FeedResponse>>;
  createPost(req: CreatePostRequest): Promise<ApiResult<void>>;
  deletePost(postId: string): Promise<ApiResult<void>>;
  react(req: ReactRequest): Promise<ApiResult<void>>;
  addComment(req: AddCommentRequest): Promise<ApiResult<FeedComment>>;
  getComments(postId: string, page?: PageQuery): Promise<ApiResult<CommentsResponse>>;

  // --- AI coach ---
  coach(req: CoachRequest): Promise<ApiResult<CoachResponse>>;

  // --- Gym busyness ---
  busyness(query: BusynessQuery): Promise<ApiResult<BusynessResponse>>;

  // --- Account lifecycle ---
  exportMyData(): Promise<ApiResult<DataExportResponse>>;
  deleteMyAccount(): Promise<ApiResult<void>>;
}
