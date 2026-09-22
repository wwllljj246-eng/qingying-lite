/**
 * 轻盈 Lite — Render / 本地生产服务器（零依赖 Node，使用内置 http）
 *
 * 职责：
 *   - /api/* 全部交给 server/api-handler.mjs（与 Vercel 共用同一套 API 逻辑）
 *   - 提供 dist-web-showcase 静态文件
 *   - React/Expo Web 前端路由 SPA fallback（刷新不 404）
 *
 * 运行：
 *   node server/index.mjs
 *   或：cd server && npm start
 *
 * 环境变量：见 .env.example 与 server/api-handler.mjs。
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './api-handler.mjs';

// ESM 下无 __dirname，手动推导
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ----------------------------- 读取 .env（极简解析，无依赖；Render/Vercel 用环境变量注入） ----------------------------- */
function loadEnv() {
  const file = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 3000);

/* 前端静态构建目录（同源部署）：可通过 WEB_DIR 覆盖 */
const WEB_DIR = process.env.WEB_DIR
  ? path.resolve(process.env.WEB_DIR)
  : path.resolve(__dirname, '../dist-web-showcase');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url);
  if (rel === '/' || rel === '') rel = '/index.html';
  const safeRel = path
    .normalize(rel)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  const filePath = path.join(WEB_DIR, safeRel);
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 无扩展名 → 视为 SPA 路由，回退 index.html（刷新不 404）
      if (path.extname(filePath) === '') {
        fs.readFile(path.join(WEB_DIR, 'index.html'), (e2, d2) => {
          if (e2) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(d2);
          }
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  // API 优先（/api/* 全部由共享 handler 处理，含 404）
  const handled = await handleApi(req, res);
  if (handled) return;

  // 静态资源 / SPA fallback（仅处理非 /api 的 GET）
  const url = (req.url || '/').split('?')[0];
  if (req.method === 'GET' && !url.startsWith('/api/')) {
    serveStatic(req, res, url);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
  console.log(`Web: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);
});
