/**
 * SecureStore-backed storage adapter for the Supabase auth session (S2). This
 * keeps the access + refresh tokens in the iOS Keychain / Android Keystore
 * instead of plaintext AsyncStorage, where they were readable on a jailbroken/
 * rooted device or an unencrypted backup.
 *
 * SecureStore caps a single value at ~2KB on Android, but a Supabase session
 * (JWT + refresh token + user object) can exceed that — so values are split into
 * ~2KB chunks: `${key}.0`, `${key}.1`, … plus a `${key}.meta` holding the chunk
 * count. The exported object matches the minimal get/set/remove interface
 * supabase-js expects for `auth.storage`.
 *
 * Note: switching storage means any pre-existing AsyncStorage session won't be
 * found here, so a previously signed-in user is asked to sign in again once. The
 * local ledger is untouched (local-first), and OweMe hasn't shipped yet, so no
 * real sessions are affected.
 */

import * as SecureStore from 'expo-secure-store';

const CHUNK = 2000; // bytes per value, under SecureStore's ~2048 Android limit
const metaKey = (k: string) => `${k}.meta`;
const chunkKey = (k: string, i: number) => `${k}.${i}`;

async function removeItem(key: string): Promise<void> {
  const meta = await SecureStore.getItemAsync(metaKey(key));
  if (meta == null) return;
  const count = Number(meta);
  for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
  await SecureStore.deleteItemAsync(metaKey(key));
}

async function getItem(key: string): Promise<string | null> {
  const meta = await SecureStore.getItemAsync(metaKey(key));
  if (meta == null) return null;
  const count = Number(meta);
  if (!Number.isInteger(count) || count <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part == null) return null; // partial/corrupt write → treat as no session
    parts.push(part);
  }
  return parts.join('');
}

async function setItem(key: string, value: string): Promise<void> {
  // Clear any previous (possibly longer) write so stale chunks can't linger.
  await removeItem(key);
  const count = Math.max(1, Math.ceil(value.length / CHUNK));
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
  }
  await SecureStore.setItemAsync(metaKey(key), String(count));
}

export const secureStorage = { getItem, setItem, removeItem };
