/**
 * The URL a browser can point an <img> at for a candidate's profile photo.
 *
 * The storage key is deliberately not handed out: `/api/files/:folder/:sub/:name` needs a
 * bearer token an <img> tag cannot send, and it frames every file as an octet-stream
 * attachment, so a photo served through it renders nothing.
 *
 * `v` is the random tail of the storage key. Replacing the photo changes the URL, so a
 * cached copy of the old one is never shown.
 */
export function avatarUrl(
  subscriberId: number | bigint | null | undefined,
  photoName: string | null | undefined,
): string | null {
  const key = photoName?.trim();
  if (!key || !subscriberId) return null;
  const version = key.slice(key.lastIndexOf('/') + 1);
  return `/api/files/avatar/${Number(subscriberId)}?v=${encodeURIComponent(version)}`;
}
