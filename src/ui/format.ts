/** Display formatting helpers for weights, dates and durations. */
import type { WeightUnit } from '../domain/types';

export function formatWeight(weight: number, unit: WeightUnit): string {
  const rounded = Math.round(weight * 10) / 10;
  const clean = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${clean} ${unit}`;
}

export function formatVolume(volume: number, unit: WeightUnit): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k ${unit}`;
  return `${Math.round(volume)} ${unit}`;
}

export function formatRelativeDate(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
