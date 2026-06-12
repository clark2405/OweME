/**
 * Tiny global toast/snackbar store — same observable + useSyncExternalStore
 * pattern as the data store (no extra deps). One toast at a time; showing a new
 * one replaces the current. Used for undo affordances (delete, mark-returned).
 */

import { useSyncExternalStore } from 'react';

export interface Toast {
  /** Monotonic id so the Toaster can reset its dismiss timer per toast. */
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Auto-dismiss after this many ms (default 4000). */
  duration: number;
}

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}

export function showToast(opts: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}) {
  current = {
    id: nextId++,
    message: opts.message,
    actionLabel: opts.actionLabel,
    onAction: opts.onAction,
    duration: opts.duration ?? 4000,
  };
  emit();
}

export function dismissToast() {
  if (!current) return;
  current = null;
  emit();
}
