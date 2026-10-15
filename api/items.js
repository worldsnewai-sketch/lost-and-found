// GET  /api/items  → 분실물 목록
// POST /api/items  → 분실물 등록 (사진은 data URL 로 함께 전송)
import { randomUUID } from 'node:crypto';
import { listItems, saveItem, savePhoto } from '../lib/store.js';

const CATEGORIES = ['학용품', '옷·모자', '물통·도시락', '가방·주머니', '전자기기', '장난감', '기타'];
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET() {
  try {
    const items = await listItems();
    items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return json({ items });
  } catch (err) {
    console.error(err);
    return json({ error: '목록을 불러오지 못했어요. 저장소 연결을 확인해 주세요.' }, 500);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: '잘못된 요청이에요.' }, 400);
  }

  const name = text(body.name, 40);
  if (!name) return json({ error: '물건 이름을 적어 주세요.' }, 400);

  const match = typeof body.photo === 'string' && body.photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) return json({ error: '사진을 넣어 주세요.' }, 400);
  const [, photoType, base64] = match;
  if (!PHOTO_TYPES.includes(photoType)) return json({ error: 'JPG, PNG, WEBP 사진만 올릴 수 있어요.' }, 400);
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_PHOTO_BYTES) return json({ error: '사진이 너무 커요. (최대 3MB)' }, 400);

  const id = randomUUID();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.foundDate ?? '') ? body.foundDate : '';

  try {
    const photoUrl = await savePhoto(id, buffer, photoType);
    const item = {
      id,
      name,
      category: CATEGORIES.includes(body.category) ? body.category : '기타',
      color: text(body.color, 20),
      foundPlace: text(body.foundPlace, 40),
      foundDate: date,
      keptAt: text(body.keptAt, 40),
      description: text(body.description, 300),
      finder: text(body.finder, 20),
      photoUrl,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    };
    await saveItem(item);
    return json({ item }, 201);
  } catch (err) {
    console.error(err);
    return json({ error: '저장하지 못했어요. 잠시 후 다시 해 주세요.' }, 500);
  }
}
