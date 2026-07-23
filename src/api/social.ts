/** Social-graph contract types: profiles, follows, feed posts, reactions. */
import type { Visibility } from './common';

/** The current user's relationship to another account. */
export type FollowState = 'none' | 'pending' | 'following' | 'self';

/** A trimmed profile safe to show to other users. */
export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  followerCount: number;
  followingCount: number;
  followState: FollowState;
  /** True when this account approves followers manually (private account). */
  isPrivate: boolean;
}

export type FeedPostKind = 'workout' | 'activity' | 'pr' | 'photo' | 'note';

/** A post in the activity feed, referencing an underlying domain record. */
export interface FeedPost {
  id: string;
  authorId: string;
  kind: FeedPostKind;
  /** Id of the referenced workout/activity/photo record, if any. */
  refId: string | null;
  caption?: string;
  visibility: Visibility;
  createdAt: string;
}

/** A compact, pre-rendered summary the feed can display without extra fetches. */
export interface FeedItemSummary {
  title: string;
  /** e.g. "Bench Press · new est. 1RM 120 kg" or "10.2 km run · 48:30". */
  subtitle: string;
  /** Optional signed URL for a photo post (short-lived). */
  imageUrl?: string;
  /** Optional key stats to render as chips. */
  stats?: { label: string; value: string }[];
}

export interface FeedReaction {
  emoji: string;
  count: number;
  /** Whether the current user has reacted with this emoji. */
  mine: boolean;
}

/** A fully-hydrated feed entry ready to render. */
export interface FeedItem {
  post: FeedPost;
  author: PublicProfile;
  summary: FeedItemSummary;
  reactions: FeedReaction[];
  commentCount: number;
}

export interface FeedComment {
  id: string;
  postId: string;
  author: PublicProfile;
  body: string;
  createdAt: string;
}
