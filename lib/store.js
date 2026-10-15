// 저장소: Vercel Blob (배포) / 메모리 (로컬 개발)
// BLOB_READ_WRITE_TOKEN 이 있으면 Vercel Blob 을 사용합니다.
import { put, list, del } from '@vercel/blob';

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const mem = (globalThis.__lostFoundMem ??= { items: new Map(), photos: new Map() });

export async function savePhoto(id, buffer, contentType) {
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  if (!useBlob()) {
    mem.photos.set(id, { buffer, contentType });
    return `/dev-photo/${id}`;
  }
  const blob = await put(`photos/${id}.${ext}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function saveItem(item) {
  if (!useBlob()) {
    mem.items.set(item.id, item);
    return;
  }
  await put(`items/${item.id}.json`, JSON.stringify(item), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
}

export async function listItems() {
  if (!useBlob()) return [...mem.items.values()];

  const blobs = [];
  let cursor;
  do {
    const res = await list({ prefix: 'items/', cursor, limit: 1000 });
    blobs.push(...res.blobs);
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);

  // uploadedAt 을 쿼리로 붙여 덮어쓴 직후에도 캐시된 옛 내용을 받지 않게 함
  const items = await Promise.all(
    blobs.map(async (b) => {
      try {
        const r = await fetch(`${b.url}?v=${new Date(b.uploadedAt).getTime()}`, { cache: 'no-store' });
        return r.ok ? await r.json() : null;
      } catch {
        return null;
      }
    })
  );
  return items.filter(Boolean);
}

export async function getItem(id) {
  const items = await listItems();
  return items.find((it) => it.id === id) ?? null;
}

export async function deleteItem(item) {
  if (!useBlob()) {
    mem.items.delete(item.id);
    mem.photos.delete(item.id);
    return;
  }
  const urls = [];
  const { blobs } = await list({ prefix: `items/${item.id}.json` });
  urls.push(...blobs.map((b) => b.url));
  if (item.photoUrl?.startsWith('http')) urls.push(item.photoUrl);
  if (urls.length) await del(urls);
}

export function devPhoto(id) {
  return mem.photos.get(id) ?? null;
}
