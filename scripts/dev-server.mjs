// 로컬 개발용 서버: 정적 파일 + /api/* 함수 (Blob 토큰이 없으면 메모리에 저장)
// 실행: npm run dev  → http://localhost:3000
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.ADMIN_PIN ??= '1234';
const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT) || 3000;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    try {
      if (url.pathname.startsWith('/dev-photo/')) {
        const { devPhoto } = await import('../lib/store.js');
        const p = devPhoto(url.pathname.split('/').pop());
        if (!p) return res.writeHead(404).end();
        return res.writeHead(200, { 'content-type': p.contentType }).end(p.buffer);
      }
      if (url.pathname.startsWith('/api/')) {
        const name = url.pathname.slice(5).replace(/[^a-z-]/g, '');
        const mod = await import(pathToFileURL(join(root, 'api', `${name}.js`)).href);
        const handler = mod[req.method];
        if (!handler) return res.writeHead(405).end();
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const request = new Request(url, {
          method: req.method,
          headers: req.headers,
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
        });
        const response = await handler(request);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        return res.end(Buffer.from(await response.arrayBuffer()));
      }
      const file = normalize(join(root, url.pathname === '/' ? 'index.html' : url.pathname));
      if (!file.startsWith(root)) return res.writeHead(403).end();
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(data);
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'ERR_MODULE_NOT_FOUND') return res.writeHead(404).end('Not found');
      console.error(err);
      res.writeHead(500).end('Server error');
    }
  })
  .listen(port, () => console.log(`분실물 찾기 개발 서버: http://localhost:${port}  (관리자 비밀번호 ${process.env.ADMIN_PIN})`));
