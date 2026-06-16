/**
 * Supabase Storage for item photos + borrower avatars (TASKS.md E1).
 *
 * The image pickers (add.tsx, BorrowerEditSheet) hand the store a *local* file
 * URI for instant display. The store's persist path then calls `uploadImage`,
 * which pushes the bytes to the public `photos` bucket under `{uid}/{kind}/...`
 * and returns a resolvable Storage URL to swap into the cache + DB row. Because
 * the URL is public, the photo survives a device hop (the whole point of E1).
 *
 * Pass-through by design: a URI that's already a remote http(s) URL (or empty)
 * comes back unchanged, so callers can apply it unconditionally.
 */

import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { uuid } from './id';

const BUCKET = 'photos';

/** A URI we still need to upload — picker output, not yet a remote Storage URL. */
export function isLocalUri(uri: string | undefined): uri is string {
  if (!uri) return false;
  return !/^https?:\/\//i.test(uri);
}

function extOf(uri: string): string {
  const m = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(uri);
  const ext = (m ? m[1] : 'jpg').toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext;
}

function contentTypeFor(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Upload a local image to Storage and return its public URL. Returns the input
 * unchanged when it's already remote or empty, or when there's no session (a
 * write shouldn't happen signed-out, but we keep the local URI rather than throw).
 * Throws on a real upload failure so the store's `persist` can reconcile + toast.
 */
export async function uploadImage(
  uri: string | undefined,
  kind: 'item' | 'avatar',
): Promise<string | undefined> {
  if (!uri || !isLocalUri(uri)) return uri;

  const { data } = await supabase.auth.getSession(); // local read, no network
  const userId = data.session?.user.id;
  if (!userId) return uri;

  const ext = extOf(uri);
  const path = `${userId}/${kind}/${uuid()}.${ext}`;
  const bytes = await new File(uri).arrayBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: contentTypeFor(ext), upsert: false });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
