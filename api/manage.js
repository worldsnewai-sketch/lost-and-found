// POST /api/manage  { id, action: 'return' | 'reopen' | 'delete', pin }
// 선생님(관리자)만: 환경변수 ADMIN_PIN 과 같은 비밀번호가 필요합니다.
import { timingSafeEqual } from 'node:crypto';
import { getItem, saveItem, deleteItem } from '../lib/store.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function pinOk(pin) {
  const expected = process.env.ADMIN_PIN;
  if (!expected || typeof pin !== 'string') return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  if (!process.env.ADMIN_PIN) {
    return json({ error: '관리자 비밀번호(ADMIN_PIN)가 아직 설정되지 않았어요.' }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: '잘못된 요청이에요.' }, 400);
  }
  if (!pinOk(body.pin)) return json({ error: '비밀번호가 맞지 않아요.' }, 401);
  if (body.action === 'check') return json({ ok: true });

  const item = typeof body.id === 'string' ? await getItem(body.id) : null;
  if (!item) return json({ error: '물건을 찾을 수 없어요.' }, 404);

  try {
    if (body.action === 'delete') {
      await deleteItem(item);
      return json({ deleted: item.id });
    }
    if (body.action === 'return' || body.action === 'reopen') {
      const updated = {
        ...item,
        status: body.action === 'return' ? 'returned' : 'waiting',
        returnedAt: body.action === 'return' ? new Date().toISOString() : undefined,
      };
      await saveItem(updated);
      return json({ item: updated });
    }
  } catch (err) {
    console.error(err);
    return json({ error: '처리하지 못했어요. 잠시 후 다시 해 주세요.' }, 500);
  }
  return json({ error: '알 수 없는 요청이에요.' }, 400);
}
